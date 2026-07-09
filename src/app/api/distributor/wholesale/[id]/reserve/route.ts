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

    try {
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.wholesaleOrder.findUnique({
                where: { id: orderId, organizationId },
                include: { items: true }
            });

            if (!order) {
                throw new Error('Order not found');
            }

            if (order.status !== 'draft') {
                throw new Error('Order can only be reserved from draft status');
            }

            // Reserve stock for each item
            for (const item of order.items) {
                // Find available stock items
                const availableStockItems = await tx.stockItem.findMany({
                    where: {
                        organizationId,
                        productId: item.productId,
                        status: 'in_stock'
                    },
                    take: item.quantity,
                    orderBy: { receivedAt: 'asc' } // FIFO
                });

                if (availableStockItems.length < item.quantity) {
                    throw new Error(`Not enough stock for product ${item.productId}. Needed ${item.quantity}, found ${availableStockItems.length}.`);
                }

                const stockItemIds = availableStockItems.map(si => si.id);

                // Update stock items
                await tx.stockItem.updateMany({
                    where: { id: { in: stockItemIds } },
                    data: {
                        status: 'reserved',
                        wholesaleOrderId: orderId
                    }
                });
            }

            // Update order status
            const updatedOrder = await tx.wholesaleOrder.update({
                where: { id: orderId },
                data: { status: 'reserved' },
                include: { items: true, stockItems: true }
            });

            return updatedOrder;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error reserving wholesale order:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 400 });
    }
}
