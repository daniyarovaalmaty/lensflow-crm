export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { canEditOrder } from '@/types/order';

declare global {
    var orders: any[] | undefined;
}

const getOrders = () => {
    if (!global.orders) global.orders = [];
    return global.orders;
};

/**
 * GET /api/orders/[id] — Get single order
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const order = getOrders().find(o => o.order_id === params.id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json(order);
}

/**
 * PATCH /api/orders/[id] — Doctor edits order (only while canEditOrder)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const orders = getOrders();
    const index = orders.findIndex(o => o.order_id === params.id);

    if (index === -1) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[index];

    if (!canEditOrder(order)) {
        return NextResponse.json(
            { error: 'Order is no longer editable. Either in production or edit window has expired.' },
            { status: 403 }
        );
    }

    const body = await request.json();

    // Only allow updating safe fields — not status, not meta timestamps
    const allowedFields = ['patient', 'config', 'notes', 'delivery_method', 'delivery_address', 'company', 'inn'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
        if (body[field] !== undefined) updates[field] = body[field];
    }

    orders[index] = {
        ...order,
        ...updates,
        meta: { ...order.meta, updated_at: new Date().toISOString() },
    };

    return NextResponse.json(orders[index]);
}
