import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { LeadStage } from '@prisma/client';

// GET /api/crm/leads — list leads with filters
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const funnel = searchParams.get('funnel') || 'sales';
    const assigneeId = searchParams.get('assigneeId');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = { funnel };

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

// POST /api/crm/leads — create a new lead
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { phone, name, city, source, assigneeId, clinicId, notes, tags, funnel } = body;
    const targetFunnel = funnel || 'sales';

    if (!phone) {
        return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }

    // Check if lead with this phone already exists in the SAME funnel
    const existing = await prisma.lead.findFirst({
        where: { phone, funnel: targetFunnel },
    });

    if (existing) {
        return NextResponse.json({
            error: `Lead with this phone already exists in ${targetFunnel} funnel`,
            existingLeadId: existing.id,
        }, { status: 409 });
    }

    const lead = await prisma.lead.create({
        data: {
            phone,
            name,
            city,
            source: source || 'manual',
            funnel: targetFunnel,
            stage: targetFunnel === 'retention' ? 'checkup' : 'new_lead',
            assigneeId,
            clinicId,
            notes,
            tags: tags || [],
        },
        include: {
            assignee: { select: { id: true, fullName: true } },
            clinic: { select: { id: true, name: true } },
        },
    });

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
