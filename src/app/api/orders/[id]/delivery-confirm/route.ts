export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * PATCH /api/orders/[id]/delivery-confirm - Doctor/optic confirms delivery
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const orderNumber = params.id;
        const body = await request.json();
        const { confirmed } = body;

        const order = await prisma.order.findUnique({ where: { orderNumber } });
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Only orders in out_for_delivery can be confirmed
        if (order.status !== 'out_for_delivery') {
            return NextResponse.json({ error: 'Заказ не в статусе доставки' }, { status: 400 });
        }

        const updateData: any = {
            deliveryConfirmed: confirmed === true,
        };

        // If confirmed, move to delivered
        if (confirmed === true) {
            updateData.status = 'delivered';
            updateData.deliveredAt = new Date();
        }

        await prisma.order.update({
            where: { id: order.id },
            data: updateData,
        });

        return NextResponse.json({ success: true, confirmed: confirmed === true });
    } catch (error) {
        console.error('PATCH /api/orders/[id]/delivery-confirm error:', error);
        return NextResponse.json({ error: 'Failed to confirm delivery' }, { status: 500 });
    }
}
