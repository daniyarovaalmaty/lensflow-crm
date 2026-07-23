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
                let neededQty = item.quantity;

                if (item.stockItemId) {
                    // Specific batch/diopter requested
                    const si = await tx.stockItem.findUnique({ where: { id: item.stockItemId } });
                    if (!si || si.status !== 'in_stock' || si.quantity < neededQty) {
                        throw new Error(`Недостаточно остатка в выбранной партии для товара ${item.productId}`);
                    }

                    if (si.quantity === neededQty) {
                        await tx.stockItem.update({
                            where: { id: si.id },
                            data: { status: 'reserved', wholesaleOrderId: orderId }
                        });
                    } else {
                        // Split the stock item
                        await tx.stockItem.update({
                            where: { id: si.id },
                            data: { quantity: si.quantity - neededQty }
                        });
                        // Create a clone for the reserved portion
                        const { id: _removedId, ...cloneData } = si;
                        await tx.stockItem.create({
                            data: {
                                ...cloneData,
                                quantity: neededQty,
                                status: 'reserved',
                                wholesaleOrderId: orderId
                            }
                        });
                    }
                } else {
                    // Fallback: Find available stock items (FIFO)
                    const availableStockItems = await tx.stockItem.findMany({
                        where: {
                            organizationId,
                            productId: item.productId,
                            status: 'in_stock'
                        },
                        orderBy: { receivedAt: 'asc' } // FIFO
                    });

                    let foundQty = 0;
                    for (const si of availableStockItems) {
                        if (neededQty <= 0) break;

                        const takeQty = Math.min(si.quantity, neededQty);

                        if (si.quantity === takeQty) {
                            await tx.stockItem.update({
                                where: { id: si.id },
                                data: { status: 'reserved', wholesaleOrderId: orderId }
                            });
                        } else {
                            await tx.stockItem.update({
                                where: { id: si.id },
                                data: { quantity: si.quantity - takeQty }
                            });
                            const { id: _removedId, ...cloneData } = si;
                            await tx.stockItem.create({
                                data: {
                                    ...cloneData,
                                    quantity: takeQty,
                                    status: 'reserved',
                                    wholesaleOrderId: orderId
                                }
                            });
                        }

                        neededQty -= takeQty;
                        foundQty += takeQty;
                    }

                    if (neededQty > 0) {
                        throw new Error(`Недостаточно общего остатка для товара ${item.productId}. Требовалось ${item.quantity}, найдено ${foundQty}.`);
                    }
                }
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
