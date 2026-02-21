import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

declare global {
    var orders: any[] | undefined;
}

const getOrders = () => {
    if (!global.orders) {
        global.orders = [];
    }
    return global.orders;
};

const AddDefectSchema = z.object({
    qty: z.number().int().min(1, 'Количество должно быть не менее 1'),
    note: z.string().optional(),
});

/**
 * POST /api/orders/[id]/defects - Add a defect record to an order
 * Only allowed when order is in_production
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const orderId = params.id;
        const body = await request.json();

        const validatedData = AddDefectSchema.parse(body);

        const orders = getOrders();
        const order = orders.find(o => o.order_id === orderId);

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        if (order.status !== 'in_production' && order.status !== 'ready' && order.status !== 'rework') {
            return NextResponse.json(
                { error: 'Defects can only be added during production, ready, or rework stage' },
                { status: 400 }
            );
        }

        // Create defect record
        const defect = {
            id: `DEF-${Date.now().toString(36).toUpperCase()}`,
            qty: validatedData.qty,
            date: new Date().toISOString(),
            note: validatedData.note || undefined,
        };

        // Initialize defects array if needed
        if (!order.defects) {
            order.defects = [];
        }

        order.defects.push(defect);
        order.meta.updated_at = new Date().toISOString();

        return NextResponse.json({ defect, order }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/orders/[id]/defects error:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to add defect' },
            { status: 500 }
        );
    }
}
