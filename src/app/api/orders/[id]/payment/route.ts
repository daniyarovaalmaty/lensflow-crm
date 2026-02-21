export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

declare global {
    var orders: any[] | undefined;
}

/**
 * PATCH /api/orders/[id]/payment - Toggle payment status
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await request.json();
        const { payment_status } = body;

        if (!['unpaid', 'paid', 'partial'].includes(payment_status)) {
            return NextResponse.json(
                { error: 'Invalid payment status' },
                { status: 400 }
            );
        }

        const orders = global.orders || [];
        const order = orders.find(o => o.order_id === id);

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        order.payment_status = payment_status;
        order.meta.updated_at = new Date().toISOString();

        return NextResponse.json(order);
    } catch (error) {
        console.error('PATCH /api/orders/[id]/payment error:', error);
        return NextResponse.json(
            { error: 'Failed to update payment status' },
            { status: 500 }
        );
    }
}
