export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

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
 * PATCH /api/orders/[id]/defects/[defectId]/archive
 * Toggle archived status on a defect record
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; defectId: string } }
) {
    try {
        const { id: orderId, defectId } = params;
        const body = await request.json();

        const orders = getOrders();
        const order = orders.find(o => o.order_id === orderId);

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (!order.defects) {
            return NextResponse.json({ error: 'No defects on this order' }, { status: 404 });
        }

        const defect = order.defects.find((d: any) => d.id === defectId);
        if (!defect) {
            return NextResponse.json({ error: 'Defect not found' }, { status: 404 });
        }

        defect.archived = body.archived ?? !defect.archived;
        order.meta.updated_at = new Date().toISOString();

        return NextResponse.json({ defect, order });
    } catch (error: any) {
        console.error('PATCH archive error:', error);
        return NextResponse.json({ error: 'Failed to update defect' }, { status: 500 });
    }
}
