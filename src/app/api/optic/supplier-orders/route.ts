import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ==================== GET — list supplier orders for the org ====================
export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const orders = await prisma.supplierOrder.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
}

// ==================== POST — create a supplier (purchase) order ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const orgId = user.organizationId;

    const body = await req.json();
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) return NextResponse.json({ error: 'Добавьте хотя бы одну позицию' }, { status: 400 });

    const items = rawItems.map((i: any) => ({
        productId: i.productId || null,
        name: i.name || 'Товар',
        sku: i.sku || null,
        qty: Number(i.qty) || 0,
        receivedQty: 0,
        price: Number(i.price) || 0,
    }));
    const totalAmount = Math.round(items.reduce((s: number, i: any) => s + i.price * i.qty, 0));

    const count = await prisma.supplierOrder.count({ where: { organizationId: orgId } });
    const number = `ЗП-${String(count + 1).padStart(4, '0')}`;

    const order = await prisma.supplierOrder.create({
        data: {
            organizationId: orgId,
            number,
            status: 'draft',
            supplierName: body.supplierName || null,
            supplierOrgId: body.supplierOrgId || null,
            items,
            totalAmount,
            notes: body.notes || null,
            createdById: user.id,
            createdByName: user.fullName || null,
        },
    });
    return NextResponse.json(order, { status: 201 });
}
