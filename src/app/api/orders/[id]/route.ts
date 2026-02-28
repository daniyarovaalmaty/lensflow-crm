export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

/**
 * Helper: find order by orderNumber and check access
 */
async function findOrderWithAccess(orderNumber: string, session: any) {
    const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { patient: true, organization: { select: { name: true } } },
    });
    if (!order) return null;

    // Lab sees everything
    if (session.user.role === 'laboratory') return order;
    // Clinic sees only its org's orders
    if (session.user.role === 'optic' && order.organizationId === session.user.organizationId) return order;
    // Doctor sees only their own orders
    if (session.user.role === 'doctor' && order.createdById === session.user.id) return order;

    return null; // no access
}

/**
 * Helper: transform DB order to frontend format
 */
function transformOrder(order: any) {
    const statusMap: Record<string, string> = {
        'new_order': 'new', 'in_production': 'in_production', 'ready': 'ready',
        'rework': 'rework', 'shipped': 'shipped', 'out_for_delivery': 'out_for_delivery',
        'delivered': 'delivered', 'cancelled': 'cancelled',
    };
    return {
        order_id: order.orderNumber,
        meta: {
            optic_id: order.organizationId || '',
            optic_name: order.organization?.name || order.opticName || '',
            doctor: order.doctorName || '',
            created_at: order.createdAt.toISOString(),
            updated_at: order.updatedAt.toISOString(),
        },
        patient: order.patient ? {
            id: order.patient.id, name: order.patient.name,
            phone: order.patient.phone, email: order.patient.email || undefined,
            notes: order.patient.notes || undefined,
        } : { name: '', phone: '' },
        config: order.lensConfig,
        company: order.company || undefined,
        inn: order.inn || undefined,
        delivery_method: order.deliveryMethod || undefined,
        delivery_address: order.deliveryAddress || undefined,
        doctor_email: order.doctorEmail || undefined,
        status: statusMap[order.status] || order.status,
        is_urgent: order.isUrgent,
        edit_deadline: order.editDeadline?.toISOString(),
        tracking_number: order.trackingNumber || undefined,
        production_started_at: order.productionStartedAt?.toISOString(),
        production_completed_at: order.productionCompletedAt?.toISOString(),
        shipped_at: order.shippedAt?.toISOString(),
        delivered_at: order.deliveredAt?.toISOString(),
        notes: order.notes || undefined,
        payment_status: order.paymentStatus,
        defects: (order.defects as any[]) || [],
    };
}

/**
 * GET /api/orders/[id] — Get single order
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

    const order = await findOrderWithAccess(params.id, session);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json(transformOrder(order));
}

/**
 * PATCH /api/orders/[id] — Doctor edits order (only while editable)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

    const order = await findOrderWithAccess(params.id, session);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Check if editable
    if (order.status !== 'new_order') {
        return NextResponse.json({ error: 'Order is no longer editable' }, { status: 403 });
    }
    if (order.editDeadline && new Date() >= order.editDeadline) {
        return NextResponse.json({ error: 'Edit window has expired' }, { status: 403 });
    }

    const body = await request.json();

    const updateData: any = {};
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.delivery_method !== undefined) updateData.deliveryMethod = body.delivery_method;
    if (body.delivery_address !== undefined) updateData.deliveryAddress = body.delivery_address;
    if (body.company !== undefined) updateData.company = body.company;
    if (body.inn !== undefined) updateData.inn = body.inn;
    if (body.config !== undefined) updateData.lensConfig = body.config;

    // Update patient if provided
    if (body.patient && order.patientId) {
        await prisma.patient.update({
            where: { id: order.patientId },
            data: {
                name: body.patient.name,
                phone: body.patient.phone,
                email: body.patient.email || undefined,
                notes: body.patient.notes || undefined,
            },
        });
    }

    const updated = await prisma.order.update({
        where: { id: order.id },
        data: updateData,
        include: { patient: true, organization: { select: { name: true } } },
    });

    return NextResponse.json(transformOrder(updated));
}
