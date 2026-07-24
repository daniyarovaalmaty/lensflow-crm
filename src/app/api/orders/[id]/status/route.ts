export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { UpdateOrderStatusSchema } from '@/types/order';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { sendWhatsAppMessage } from '@/lib/greenApi';

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
            'draft': 'draft', 'new': 'new_order', 'in_production': 'in_production', 'ready': 'ready',
            'rework': 'rework', 'docs_prep': 'docs_prep', 'accountant_review': 'accountant_review',
            'docs_ready': 'docs_ready', 'shipped': 'shipped', 'out_for_delivery': 'out_for_delivery',
            'delivered': 'delivered', 'cancelled': 'cancelled',
        };

        const newStatus = statusMap[validatedData.status] || validatedData.status;
        const now = new Date();

        // lab_admin can only change shipped → out_for_delivery
        const sub = session.user.subRole;
        if (sub === 'lab_admin') {
            const currentStatus = Object.entries(statusMap).find(([, v]) => v === order.status)?.[0] || order.status;
            const allowedTransitions: Record<string, string[]> = {
                'new': ['in_production', 'cancelled'],
                'in_production': ['ready', 'cancelled'],
                'ready': ['shipped', 'rework'],
                'rework': ['in_production', 'cancelled'],
                'shipped': ['accountant_review'],
                'accountant_review': ['docs_ready'],
                'docs_ready': ['out_for_delivery'],
            };
            const allowed = allowedTransitions[currentStatus] || [];
            if (!allowed.includes(validatedData.status)) {
                return NextResponse.json(
                    { error: 'Недостаточно прав для этого перехода' },
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

        // Order issue → write off selected stock items (выдача списывает склад).
        const writeOff = (body as any).writeOff;
        if (validatedData.status === 'delivered' && Array.isArray(writeOff) && writeOff.length > 0 && order.organizationId) {
            for (const w of writeOff) {
                const qty = Number(w.qty) || 0;
                if (qty <= 0 || !w.productId) continue;
                await prisma.opticProduct.update({ where: { id: w.productId }, data: { currentStock: { decrement: qty } } }).catch(() => {});
                await prisma.stockMovement.create({
                    data: {
                        organizationId: order.organizationId,
                        productId: w.productId,
                        type: 'write_off',
                        quantity: qty,
                        documentNumber: order.orderNumber,
                        reason: `Выдача заказа ${order.orderNumber}`,
                        performedById: (session.user as any).id || null,
                        performedByName: (session.user as any).name || null,
                    },
                });
            }
        }

        // Transform to frontend format
        
        // Send WhatsApp notifications
        try {
            if (newStatus === 'new_order' && order.status === 'draft') {
                const message = `🚨 Новый заказ №${orderNumber} от врача ${order.doctorName?.trim() || 'Неизвестно'}! Сумма: ${(order.totalPrice || 0).toLocaleString('ru-RU')} ₸. Ожидает проверки!`;
                sendWhatsAppMessage('77004601612@c.us', message).catch(err => console.error('WhatsApp Error:', err));
            } else if (newStatus === 'shipped' && order.status !== 'shipped' && order.createdById) {
                const doctorUser = await prisma.user.findUnique({ where: { id: order.createdById } });
                const doctorPhone = doctorUser?.phone;
                if (doctorPhone) {
                    // Remove non-digits
                    const cleanPhone = String(doctorPhone).replace(/\D/g, '');
                    if (cleanPhone.length >= 10) {
                        const message = `✅ Ваш заказ №${orderNumber} (Пациент: ${updated.patient?.name || 'Не указан'}) готов и передан в доставку!`;
                        sendWhatsAppMessage(`${cleanPhone}@c.us`, message).catch(err => console.error('WhatsApp Error:', err));
                    }
                }
            }
        } catch (e) {
            console.error('Failed to send WA notification', e);
        }

        const reverseStatusMap: Record<string, string> = {
            'draft': 'draft', 'new_order': 'new', 'in_production': 'in_production', 'ready': 'ready',
            'rework': 'rework', 'docs_prep': 'docs_prep', 'accountant_review': 'accountant_review',
            'docs_ready': 'docs_ready', 'shipped': 'shipped', 'out_for_delivery': 'out_for_delivery',
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
