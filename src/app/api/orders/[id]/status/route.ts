export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { UpdateOrderStatusSchema } from '@/types/order';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * PATCH /api/orders/[id]/status - Update order status
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
        const validatedData = UpdateOrderStatusSchema.parse(body);

        // Find order
        const order = await prisma.order.findUnique({ where: { orderNumber } });
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Map status string to enum
        const statusMap: Record<string, string> = {
            'new': 'new_order', 'in_production': 'in_production', 'ready': 'ready',
            'rework': 'rework', 'shipped': 'shipped', 'out_for_delivery': 'out_for_delivery',
            'delivered': 'delivered', 'cancelled': 'cancelled',
        };

        const newStatus = statusMap[validatedData.status] || validatedData.status;
        const now = new Date();

        // lab_admin can only change shipped → out_for_delivery
        const sub = session.user.subRole;
        if (sub === 'lab_admin') {
            const currentStatus = Object.entries(statusMap).find(([, v]) => v === order.status)?.[0] || order.status;
            if (!(currentStatus === 'shipped' && validatedData.status === 'out_for_delivery')) {
                return NextResponse.json(
                    { error: 'Администратор может только отправить заказ в доставку (из статуса "Отгружено")' },
                    { status: 403 }
                );
            }
        }

        const updateData: any = { status: newStatus };

        // Set timestamps based on status
        if (validatedData.status === 'in_production' && !order.productionStartedAt) {
            updateData.productionStartedAt = now;
        }
        if (validatedData.status === 'ready' && !order.productionCompletedAt) {
            updateData.productionCompletedAt = now;
        }
        if (validatedData.status === 'shipped' && !order.shippedAt) {
            updateData.shippedAt = now;
        }
        if (validatedData.status === 'delivered' && !order.deliveredAt) {
            updateData.deliveredAt = now;
        }
        if (validatedData.notes) {
            updateData.notes = validatedData.notes;
        }

        const updated = await prisma.order.update({
            where: { id: order.id },
            data: updateData,
            include: { patient: true, organization: { select: { name: true } } },
        });

        // Transform to frontend format
        const reverseStatusMap: Record<string, string> = {
            'new_order': 'new', 'in_production': 'in_production', 'ready': 'ready',
            'rework': 'rework', 'shipped': 'shipped', 'out_for_delivery': 'out_for_delivery',
            'delivered': 'delivered', 'cancelled': 'cancelled',
        };

        const response = {
            order_id: updated.orderNumber,
            meta: {
                optic_id: updated.organizationId || '',
                optic_name: updated.organization?.name || updated.opticName || '',
                doctor: updated.doctorName || '',
                created_at: updated.createdAt.toISOString(),
                updated_at: updated.updatedAt.toISOString(),
            },
            patient: updated.patient ? {
                name: updated.patient.name, phone: updated.patient.phone,
                email: updated.patient.email || undefined,
            } : { name: '', phone: '' },
            config: updated.lensConfig,
            status: reverseStatusMap[updated.status] || updated.status,
            is_urgent: updated.isUrgent,
            edit_deadline: updated.editDeadline?.toISOString(),
            tracking_number: updated.trackingNumber || undefined,
            production_started_at: updated.productionStartedAt?.toISOString(),
            production_completed_at: updated.productionCompletedAt?.toISOString(),
            shipped_at: updated.shippedAt?.toISOString(),
            delivered_at: updated.deliveredAt?.toISOString(),
            notes: updated.notes || undefined,
            payment_status: updated.paymentStatus,
            defects: (updated.defects as any[]) || [],
        };

        return NextResponse.json(response);
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
