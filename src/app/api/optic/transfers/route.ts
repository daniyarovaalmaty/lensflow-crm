import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// GET — transfers involving this org (outgoing + incoming).
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized', debug: 'no session.user.id', session: JSON.stringify(session) }, { status: 401 });
        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user?.organizationId) return NextResponse.json({ error: 'No organization', debug: 'no user.organizationId', userId: session.user.id }, { status: 403 });
        const orgId = user.organizationId;
        const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { type: true } });
        const isHQ = org?.type === 'headquarters';

        const where = isHQ ? {} : { OR: [{ fromOrgId: orgId }, { toOrgId: orgId }] };

        const transfers = await prisma.stockTransfer.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({
            transfers: transfers.map(t => ({ ...t, direction: t.fromOrgId === orgId ? 'out' : 'in' })),
            orgId,
            isHQ,
        });
    } catch (err: any) {
        console.error('TRANSFERS GET ERROR:', err);
        return NextResponse.json({ error: 'Internal error', message: err?.message, stack: err?.stack?.slice(0, 500) }, { status: 500 });
    }
}

// POST — create a transfer (draft) from the current org to another branch.
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const myOrgId = user.organizationId;

    const body = await req.json();
    const toOrgId = body.toOrgId as string;
    let fromOrgId = myOrgId;

    if (body.fromOrgId && body.fromOrgId !== myOrgId) {
        const myOrg = await prisma.organization.findUnique({ where: { id: myOrgId }, select: { type: true } });
        if (myOrg?.type === 'headquarters') {
            fromOrgId = body.fromOrgId;
        }
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!toOrgId) return NextResponse.json({ error: 'Выберите филиал назначения' }, { status: 400 });
    if (toOrgId === fromOrgId) return NextResponse.json({ error: 'Нельзя перемещать в тот же филиал' }, { status: 400 });
    if (rawItems.length === 0) return NextResponse.json({ error: 'Добавьте позиции' }, { status: 400 });

    const [fromOrg, toOrg] = await Promise.all([
        prisma.organization.findUnique({ where: { id: fromOrgId }, select: { name: true } }),
        prisma.organization.findUnique({ where: { id: toOrgId }, select: { name: true } }),
    ]);
    if (!toOrg) return NextResponse.json({ error: 'Филиал назначения не найден' }, { status: 404 });
    if (!fromOrg) return NextResponse.json({ error: 'Филиал отправки не найден' }, { status: 404 });

    const items = rawItems.map((i: any) => ({ productId: i.productId || null, name: i.name || 'Товар', sku: i.sku || null, qty: Number(i.qty) || 0 }));
    const totalQty = items.reduce((s: number, i: any) => s + i.qty, 0);

    const count = await prisma.stockTransfer.count({ where: { fromOrgId } });
    const number = `ТР-${String(count + 1).padStart(4, '0')}`;

    const t = await prisma.stockTransfer.create({
        data: {
            number, fromOrgId, toOrgId, fromName: fromOrg.name, toName: toOrg.name,
            status: 'draft', items, totalQty, notes: body.notes || null,
            createdById: user.id, createdByName: user.fullName || null,
        },
    });
    return NextResponse.json(t, { status: 201 });
}
