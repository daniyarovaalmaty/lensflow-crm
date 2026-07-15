import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// GET — transfers involving this org (outgoing + incoming).
export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const orgId = user.organizationId;

    const transfers = await prisma.stockTransfer.findMany({
        where: { OR: [{ fromOrgId: orgId }, { toOrgId: orgId }] },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(transfers.map(t => ({ ...t, direction: t.fromOrgId === orgId ? 'out' : 'in' })));
}

// POST — create a transfer (draft) from the current org to another branch.
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const orgId = user.organizationId;

    const body = await req.json();
    const toOrgId = body.toOrgId as string;
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!toOrgId) return NextResponse.json({ error: 'Выберите филиал назначения' }, { status: 400 });
    if (toOrgId === orgId) return NextResponse.json({ error: 'Нельзя перемещать в тот же филиал' }, { status: 400 });
    if (rawItems.length === 0) return NextResponse.json({ error: 'Добавьте позиции' }, { status: 400 });

    const [fromOrg, toOrg] = await Promise.all([
        prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
        prisma.organization.findUnique({ where: { id: toOrgId }, select: { name: true } }),
    ]);
    if (!toOrg) return NextResponse.json({ error: 'Филиал назначения не найден' }, { status: 404 });

    const items = rawItems.map((i: any) => ({ productId: i.productId || null, name: i.name || 'Товар', sku: i.sku || null, qty: Number(i.qty) || 0 }));
    const totalQty = items.reduce((s: number, i: any) => s + i.qty, 0);

    const count = await prisma.stockTransfer.count({ where: { fromOrgId: orgId } });
    const number = `ТР-${String(count + 1).padStart(4, '0')}`;

    const t = await prisma.stockTransfer.create({
        data: {
            number, fromOrgId: orgId, toOrgId, fromName: fromOrg?.name || null, toName: toOrg.name,
            status: 'draft', items, totalQty, notes: body.notes || null,
            createdById: user.id, createdByName: user.fullName || null,
        },
    });
    return NextResponse.json(t, { status: 201 });
}
