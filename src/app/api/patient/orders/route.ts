export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * OPTIONS /api/patient/orders — CORS preflight
 */
export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/patient/orders?phone=+77762101997
 * Public endpoint for patients to view their orders by phone number.
 * No API key required — only returns minimal, non-sensitive order info.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');

        if (!phone || phone.length < 10) {
            return NextResponse.json(
                { error: 'Phone number is required (min 10 digits)' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        // Normalize phone: strip spaces, dashes, parens
        const normalized = phone.replace(/[\s\-()]/g, '');

        const orders = await prisma.order.findMany({
            where: {
                patient: { phone: { contains: normalized } },
            },
            include: {
                patient: { select: { name: true, phone: true } },
                organization: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const STATUS_MAP: Record<string, string> = {
            'new_order': 'new',
            'in_production': 'in_production',
            'ready': 'ready',
            'rework': 'rework',
            'shipped': 'shipped',
            'out_for_delivery': 'out_for_delivery',
            'delivered': 'delivered',
            'cancelled': 'cancelled',
        };

        const result = orders.map((o: any) => ({
            lensflow_order_id: o.orderNumber,
            status: STATUS_MAP[o.status] || o.status,
            clinic_name: o.opticName || o.organization?.name || '',
            doctor_name: o.doctorName || '',
            is_urgent: o.isUrgent,
            total_price: o.totalPrice || 0,
            tracking_number: o.trackingNumber || null,
            created_at: o.createdAt.toISOString(),
            updated_at: o.updatedAt.toISOString(),
        }));

        return NextResponse.json(
            { orders: result, count: result.length },
            { headers: CORS_HEADERS }
        );

    } catch (error: any) {
        console.error('GET /api/patient/orders error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
