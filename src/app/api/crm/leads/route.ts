import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// GET /api/crm/leads — list leads with filters
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const funnel = searchParams.get('funnel') || 'sales';
    const assigneeId = searchParams.get('assigneeId');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = { funnel };

    // Scope to the user's organisation (clinic)
    if (session.user.organizationId) {
        where.clinicId = session.user.organizationId;
    }

    if (stage) where.stage = stage;
    if (assigneeId) where.assigneeId = assigneeId;
    if (source) where.source = source;
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { city: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [leads, total] = await Promise.all([
        prisma.lead.findMany({
            where,
            include: {
                assignee: { select: { id: true, fullName: true, avatar: true } },
                clinic: { select: { id: true, name: true } },
                messages: {
                    orderBy: { sentAt: 'desc' },
                    take: 1,
                    select: { content: true, sentAt: true, direction: true },
                },
                _count: { select: { messages: true } },
            },
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.lead.count({ where }),
    ]);

    // Group by stage for kanban
    const stages = await prisma.lead.groupBy({
        by: ['stage'],
        where: { funnel },
        _count: { _all: true },
    });

    return NextResponse.json({
        leads,
        total,
        page,
        limit,
        stagesCounts: stages.reduce((acc: any, s) => {
            acc[s.stage] = s._count._all;
            return acc;
        }, {}),
    });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
        phone, name, city, source, assigneeId, clinicId, notes, tags, funnel,
        acquisitionCost, campaignId, utmSource, utmMedium, utmCampaign, utmContent, utmTerm
    } = body;
    const targetFunnel = funnel || 'sales';

    if (!phone) {
        return NextResponse.json({ error: 'Телефон обязателен' }, { status: 400 });
    }

    // Normalize phone: strip spaces, dashes, brackets, leading +
    // Store in plain digit format (77001234567) — no @c.us for manual leads
    const normalizedPhone = phone.replace(/[\s\-\+\(\)]/g, '');

    // Resolve clinicId — use session org if not explicitly provided
    const resolvedClinicId = clinicId || session.user.organizationId || null;

    // Check duplicate within same funnel AND same clinic
    const existing = await prisma.lead.findFirst({
        where: {
            phone: { contains: normalizedPhone.slice(-9) },
            funnel: targetFunnel,
            ...(resolvedClinicId ? { clinicId: resolvedClinicId } : {}),
        },
    });

    if (existing) {
        return NextResponse.json({
            error: 'Лид с этим номером уже существует в этой воронке',
            existingLeadId: existing.id,
        }, { status: 409 });
    }

    const lead = await prisma.lead.create({
        data: {
            phone: normalizedPhone,
            name: name || null,
            city: city || null,
            source: source || 'manual',
            funnel: targetFunnel,
            stage: targetFunnel === 'retention' ? 'checkup' : 'new_lead',
            assigneeId: assigneeId || session.user.id || null,
            clinicId: resolvedClinicId,
            notes: notes || null,
            tags: tags || [],
            acquisitionCost: Number(acquisitionCost) || 0,
            campaignId: campaignId || null,
            utmSource: utmSource || '',
            utmMedium: utmMedium || '',
            utmCampaign: utmCampaign || '',
            utmContent: utmContent || '',
            utmTerm: utmTerm || '',
        },
        include: {
            assignee: { select: { id: true, fullName: true } },
            clinic: { select: { id: true, name: true } },
        },
    });

    // NOTE: Patient record is NOT created here.
    // It will be created automatically when the lead reaches the 'appointment' stage (PATCH handler).

    // Log activity
    await prisma.leadActivity.create({
        data: {
            leadId: lead.id,
            action: 'created',
            details: `Лид создан в воронке ${targetFunnel}. Источник: ${lead.source}`,
        },
    });

    return NextResponse.json(lead, { status: 201 });
}
