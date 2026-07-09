import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const orderId = params.id;
    const organizationId = session.user.organizationId!;
    const userId = session.user.id;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.wholesaleOrder.findUnique({
                where: { id: orderId, organizationId },
                include: { items: true, stockItems: true }
            });

            if (!order) {
                throw new Error('Order not found');
            }

            if (order.status !== 'reserved') {
                throw new Error('Order must be in reserved status to complete');
            }

            // 1. Group stock items by product to decrement currentStock and create movements
            const productCounts: Record<string, number> = {};
            for (const si of order.stockItems) {
                if (si.status !== 'reserved') {
                    throw new Error(`StockItem ${si.id} is not reserved`);
                }
                productCounts[si.productId] = (productCounts[si.productId] || 0) + 1;
            }

            // 2. Decrement OpticProduct currentStock and create StockMovement
            for (const [productId, quantity] of Object.entries(productCounts)) {
                await tx.opticProduct.update({
                    where: { id: productId },
                    data: {
                        currentStock: { decrement: quantity }
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        productId,
                        organizationId,
                        type: 'sale_out',
                        quantity,
                        notes: `Отгрузка по оптовому заказу ${order.orderNumber}`,
                        performedById: userId,
                        performedByName: session.user.name || 'Сотрудник дистрибьютора'
                    }
                });
            }

            // 3. Mark StockItems as sold
            await tx.stockItem.updateMany({
                where: { wholesaleOrderId: orderId },
                data: { status: 'sold' }
            });

            // 4. Mark Order as completed
            const updatedOrder = await tx.wholesaleOrder.update({
                where: { id: orderId },
                data: { status: 'completed' },
                include: { items: true, stockItems: true }
            });

            return updatedOrder;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error completing wholesale order:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 400 });
    }
}
