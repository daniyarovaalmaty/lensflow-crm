export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderSchema, OrderSchema } from '@/types/order';
import { getMoySkladClient } from '@/lib/integrations/moysklad';

// Mock database - in real app, use PostgreSQL/Prisma
// Use global to persist across hot reloads in development
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
 * GET /api/orders - Get all orders
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const opticId = searchParams.get('optic_id');

        let filteredOrders = [...getOrders()];

        if (status) {
            filteredOrders = filteredOrders.filter(o => o.status === status);
        }

        if (opticId) {
            filteredOrders = filteredOrders.filter(o => o.meta.optic_id === opticId);
        }

        // Sort by created_at descending
        filteredOrders.sort((a, b) =>
            new Date(b.meta.created_at).getTime() - new Date(a.meta.created_at).getTime()
        );

        return NextResponse.json(filteredOrders);
    } catch (error) {
        console.error('GET /api/orders error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/orders - Create new order
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate with Zod
        const validatedData = CreateOrderSchema.parse(body);

        // Generate order ID
        const orderId = `LX-${Date.now().toString(36).toUpperCase()}`;

        // Create order object
        const now = new Date().toISOString();
        const order = {
            order_id: orderId,
            meta: {
                optic_id: validatedData.optic_id,
                optic_name: `Optic ${validatedData.optic_id}`, // In real app, fetch from DB
                doctor: validatedData.doctor,
                created_at: now,
                updated_at: now,
            },
            patient: validatedData.patient,
            config: validatedData.config,
            status: 'new',
            notes: validatedData.notes,
        };

        // Validate complete order
        const validatedOrder = OrderSchema.parse(order);

        // Save to "database"
        getOrders().push(validatedOrder);

        // Create order in МойСклад (async, non-blocking)
        try {
            const moysklad = getMoySkladClient();
            // Mock counterparty href - in production, fetch based on optic_id
            const counterpartyHref = 'https://api.moysklad.ru/api/remap/1.2/entity/counterparty/MOCK_ID';

            await moysklad.createCustomerOrder(validatedOrder, counterpartyHref);
            console.log(`✅ Order ${orderId} synced to МойСклад`);
        } catch (msError) {
            console.error('МойСклад sync failed (non-critical):', msError);
            // Don't fail the request if МойСклад sync fails
        }

        return NextResponse.json(validatedOrder, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/orders error:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create order' },
            { status: 500 }
        );
    }
}
