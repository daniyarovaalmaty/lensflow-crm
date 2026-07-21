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

const VALID = ['accepted', 'in_progress', 'ready', 'issued', 'cancelled'];

// ==================== GET — repair journal ====================
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const status = new URL(req.url).searchParams.get('status');
    const where: any = { organizationId: { in: scope.orgIds } };
    if (status && VALID.includes(status)) where.status = status;

    const repairs = await prisma.repairOrder.findMany({ where, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(repairs);
}

// ==================== POST — accept an item for repair ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me } = scope;

    const body = await req.json();
    const itemDescription = String(body.itemDescription || '').trim();
    if (!itemDescription) return NextResponse.json({ error: 'Укажите, что сдаётся в ремонт' }, { status: 400 });

    const count = await prisma.repairOrder.count({ where: { organizationId: me.organizationId! } });
    const number = `Р-${String(count + 1).padStart(4, '0')}`;

    const repair = await prisma.repairOrder.create({
        data: {
            organizationId: me.organizationId!,
            number,
            clientName: body.clientName?.trim() || null,
            clientPhone: body.clientPhone?.trim() || null,
            itemDescription,
            problem: body.problem?.trim() || null,
            price: Math.round(Number(body.price) || 0),
            masterName: body.masterName?.trim() || null,
            notes: body.notes?.trim() || null,
            status: 'accepted',
            createdById: me.id,
            createdByName: me.fullName || null,
        },
    });
    return NextResponse.json(repair, { status: 201 });
}

// ==================== PATCH — change status / edit fields ====================
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { orgIds } = scope;

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    const existing = await prisma.repairOrder.findUnique({ where: { id: body.id } });
    if (!existing || !orgIds.includes(existing.organizationId)) return NextResponse.json({ error: 'Ремонт не найден' }, { status: 404 });

    const data: any = {};
    if (body.status && VALID.includes(body.status)) {
        data.status = body.status;
        if (body.status === 'ready' && !existing.readyAt) data.readyAt = new Date();
        if (body.status === 'issued' && !existing.issuedAt) data.issuedAt = new Date();
    }
    if (typeof body.itemDescription === 'string' && body.itemDescription.trim()) data.itemDescription = body.itemDescription.trim();
    if (typeof body.problem === 'string') data.problem = body.problem.trim() || null;
    if (typeof body.clientName === 'string') data.clientName = body.clientName.trim() || null;
    if (typeof body.clientPhone === 'string') data.clientPhone = body.clientPhone.trim() || null;
    if (typeof body.masterName === 'string') data.masterName = body.masterName.trim() || null;
    if (typeof body.notes === 'string') data.notes = body.notes.trim() || null;
    if (body.price !== undefined) data.price = Math.round(Number(body.price) || 0);

    const repair = await prisma.repairOrder.update({ where: { id: body.id }, data });
    return NextResponse.json(repair);
}

// ==================== DELETE — remove a repair (creator or manager) ====================
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const scope = await resolveScope(session.user.email!);
    if (!scope) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const { me, orgIds } = scope;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    const existing = await prisma.repairOrder.findUnique({ where: { id } });
    if (!existing || !orgIds.includes(existing.organizationId)) return NextResponse.json({ error: 'Ремонт не найден' }, { status: 404 });
    if (existing.createdById !== me.id && me.subRole !== 'optic_manager') {
        return NextResponse.json({ error: 'Удалять может автор или управляющий' }, { status: 403 });
    }

    await prisma.repairOrder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
