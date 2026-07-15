import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

async function resolveScope(email: string) {
    const me = await prisma.user.findUnique({ where: { email } });
    if (!me?.organizationId) return null;
    const org = await prisma.organization.findUnique({ where: { id: me.organizationId }, select: { type: true } });
    let orgIds: string[] = [me.organizationId];
    if (org?.type === 'headquarters') {
        const branches = await prisma.organization.findMany({ where: { parentId: me.organizationId, status: 'active' }, select: { id: true } });
        orgIds = [me.organizationId, ...branches.map((b) => b.id)];
    }
    return { me, orgIds };
}

const TYPES = ['master', 'diagnosis', 'seller', 'other'];

// ==================== GET — rework/defect journal ====================
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const orderNumber = new URL(req.url).searchParams.get('orderNumber');
    const where: any = { organizationId: { in: scope.orgIds } };
    if (orderNumber) where.orderNumber = orderNumber;

    const reworks = await prisma.orderRework.findMany({ where, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(reworks);
}

// ==================== POST — record a rework/defect ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me } = scope;

    const body = await req.json();
    const description = String(body.description || '').trim();
    if (!description) return NextResponse.json({ error: 'Опишите переделку/брак' }, { status: 400 });

    const rework = await prisma.orderRework.create({
        data: {
            organizationId: me.organizationId!,
            orderNumber: body.orderNumber?.trim() || null,
            description,
            responsibleType: TYPES.includes(body.responsibleType) ? body.responsibleType : 'master',
            responsibleName: body.responsibleName?.trim() || null,
            cost: Math.round(Number(body.cost) || 0),
            status: 'open',
            createdById: me.id,
            createdByName: me.fullName || null,
        },
    });
    return NextResponse.json(rework, { status: 201 });
}

// ==================== PATCH — resolve/reopen or edit ====================
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { orgIds } = scope;

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    const existing = await prisma.orderRework.findUnique({ where: { id: body.id } });
    if (!existing || !orgIds.includes(existing.organizationId)) return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 });

    const data: any = {};
    if (body.status === 'resolved' || body.status === 'open') {
        data.status = body.status;
        data.resolvedAt = body.status === 'resolved' ? new Date() : null;
    }
    if (typeof body.description === 'string' && body.description.trim()) data.description = body.description.trim();
    if (TYPES.includes(body.responsibleType)) data.responsibleType = body.responsibleType;
    if (typeof body.responsibleName === 'string') data.responsibleName = body.responsibleName.trim() || null;
    if (typeof body.orderNumber === 'string') data.orderNumber = body.orderNumber.trim() || null;
    if (body.cost !== undefined) data.cost = Math.round(Number(body.cost) || 0);

    const rework = await prisma.orderRework.update({ where: { id: body.id }, data });
    return NextResponse.json(rework);
}

// ==================== DELETE — remove (author or manager) ====================
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me, orgIds } = scope;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    const existing = await prisma.orderRework.findUnique({ where: { id } });
    if (!existing || !orgIds.includes(existing.organizationId)) return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 });
    if (existing.createdById !== me.id && me.subRole !== 'optic_manager') {
        return NextResponse.json({ error: 'Удалять может автор или управляющий' }, { status: 403 });
    }

    await prisma.orderRework.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
