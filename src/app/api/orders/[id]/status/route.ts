export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { UpdateOrderStatusSchema } from '@/types/order';
import { getMoySkladClient } from '@/lib/integrations/moysklad';

// In real app, import from centralized store or database
declare global {
    var orders: any[] | undefined;
}

const getOrders = () => {
    if (!global.orders) {
        global.orders = [];
    }
    return global.orders;
};

/**
 * PATCH /api/orders/[id]/status - Update order status
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const orderId = params.id;
        const body = await request.json();

        // Validate
        const validatedData = UpdateOrderStatusSchema.parse(body);

        // Find order
        const orders = getOrders();
        const orderIndex = orders.findIndex(o => o.order_id === orderId);

        if (orderIndex === -1) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        const order = orders[orderIndex];
        const now = new Date().toISOString();

        // Update order
        order.status = validatedData.status;
        order.meta.updated_at = now;

        // Set timestamps based on status
        if (validatedData.status === 'in_production' && !order.production_started_at) {
            order.production_started_at = now;
        }

        if (validatedData.status === 'ready' && !order.production_completed_at) {
            order.production_completed_at = now;
        }

        if (validatedData.status === 'shipped' && !order.shipped_at) {
            order.shipped_at = now;
        }

        if (validatedData.status === 'delivered' && !order.delivered_at) {
            order.delivered_at = now;
        }

        if (validatedData.notes) {
            order.notes = validatedData.notes;
        }

        // Update МойСклад status (async, non-blocking)
        if (order.moysklad_order_id) {
            try {
                const moysklad = getMoySkladClient();
                await moysklad.updateOrderStatus(order.moysklad_order_id, validatedData.status);
                console.log(`✅ Updated МойСклад order ${order.moysklad_order_id} to ${validatedData.status}`);
            } catch (msError) {
                console.error('МойСклад status update failed (non-critical):', msError);
            }
        }

        return NextResponse.json(order);
    } catch (error: any) {
        console.error('PATCH /api/orders/[id]/status error:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update order status' },
            { status: 500 }
        );
    }
}
