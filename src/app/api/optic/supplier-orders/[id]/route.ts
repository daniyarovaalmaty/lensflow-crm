import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// PATCH — supplier order lifecycle: send | receive | cancel.
// "receive" books a receipt (приход): increments stock + StockMovement + StockDocument.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    const orgId = user.organizationId;

    const order = await prisma.supplierOrder.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!order) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });

    const action = (await req.json())?.action as string;

    if (action === 'send') {
        if (order.status !== 'draft') return NextResponse.json({ error: 'Отправить можно только черновик' }, { status: 400 });
        return NextResponse.json(await prisma.supplierOrder.update({ where: { id: order.id }, data: { status: 'sent', sentAt: new Date() } }));
    }

    if (action === 'cancel') {
        if (order.status === 'received') return NextResponse.json({ error: 'Полученный заказ нельзя отменить' }, { status: 400 });
        return NextResponse.json(await prisma.supplierOrder.update({ where: { id: order.id }, data: { status: 'cancelled' } }));
    }

    if (action === 'receive') {
        if (order.status === 'received') return NextResponse.json({ error: 'Заказ уже получен' }, { status: 400 });
        if (order.status === 'cancelled') return NextResponse.json({ error: 'Заказ отменён' }, { status: 400 });

        const items = (order.items as any[]) || [];
        const docCount = await prisma.stockDocument.count({ where: { organizationId: orgId, type: 'receipt' } });
        const docNum = `ПН-${String(docCount + 1).padStart(4, '0')}`;

        // Add each item to stock (приход).
        for (const it of items) {
            const qty = Number(it.qty) || 0;
            if (qty <= 0 || !it.productId) continue;
            await prisma.opticProduct.update({ where: { id: it.productId }, data: { currentStock: { increment: qty } } }).catch(() => {});
            await prisma.stockMovement.create({
                data: {
                    organizationId: orgId,
                    productId: it.productId,
                    type: 'receipt',
                    quantity: qty,
                    documentNumber: docNum,
                    supplier: order.supplierName || null,
                    reason: `Заказ поставщику ${order.number}`,
                    performedById: user.id,
                    performedByName: user.fullName || null,
                },
            });
        }

        await prisma.stockDocument.create({
            data: {
                organizationId: orgId,
                documentNumber: docNum,
                type: 'receipt',
                status: 'confirmed',
                counterpartyName: order.supplierName || null,
                totalAmount: order.totalAmount,
                items: items.map((i: any) => ({ productId: i.productId, name: i.name, qty: i.qty, price: i.price })),
                notes: `Приход по заказу поставщику ${order.number}`,
                performedById: user.id,
                performedByName: user.fullName || null,
                confirmedAt: new Date(),
            },
        });

        const updated = await prisma.supplierOrder.update({
            where: { id: order.id },
            data: { status: 'received', receivedAt: new Date(), items: items.map((i: any) => ({ ...i, receivedQty: i.qty })) },
        });
        return NextResponse.json({ ...updated, receiptDoc: docNum });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}
