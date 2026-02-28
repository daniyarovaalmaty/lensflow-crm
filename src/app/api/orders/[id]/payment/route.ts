export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * PATCH /api/orders/[id]/payment - Toggle payment status
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        // Only lab_accountant can change payment status
        if (session.user.subRole !== 'lab_accountant') {
            return NextResponse.json({ error: 'Only accountant can change payment status' }, { status: 403 });
        }

        const body = await request.json();
        const { payment_status } = body;

        if (!['unpaid', 'paid', 'partial'].includes(payment_status)) {
            return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
        }

        const order = await prisma.order.findUnique({ where: { orderNumber: params.id } });
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const updated = await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: payment_status },
        });

        return NextResponse.json({ order_id: updated.orderNumber, payment_status: updated.paymentStatus });
    } catch (error) {
        console.error('PATCH /api/orders/[id]/payment error:', error);
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
    }
}
