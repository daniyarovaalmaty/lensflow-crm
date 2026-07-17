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
                include: { items: true, stockItems: true }
            });

            if (!order) {
                throw new Error('Order not found');
            }

            if (order.status !== 'reserved') {
                throw new Error('Только зарезервированные заказы можно отменить и снять с резерва');
            }

            // Unreserve stock items
            // We just clear wholesaleOrderId and set status back to in_stock
            await tx.stockItem.updateMany({
                where: { wholesaleOrderId: orderId },
                data: {
                    status: 'in_stock',
                    wholesaleOrderId: null
                }
            });

            // Update order status to cancelled
            const updatedOrder = await tx.wholesaleOrder.update({
                where: { id: orderId },
                data: { status: 'cancelled' },
                include: { items: true, stockItems: true }
            });

            return updatedOrder;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error cancelling wholesale order:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 400 });
    }
}
