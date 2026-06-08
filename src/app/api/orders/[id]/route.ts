export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

/**
 * Helper: find order by orderNumber OR cuid id, check access
 */
async function findOrderWithAccess(idOrNumber: string, session: any) {
    // Try by orderNumber first (e.g. "AB44"), then by cuid
    let order = await prisma.order.findUnique({
        where: { orderNumber: idOrNumber },
        include: { patient: true, organization: { select: { name: true } } },
    });
    if (!order) {
        order = await prisma.order.findUnique({
            where: { id: idOrNumber },
            include: { patient: true, organization: { select: { name: true } } },
        });
    }
    if (!order) return null;

    // Lab sees everything (direct + forwarded)
    if (session.user.role === 'laboratory') return order;
    // Distributor sees orders assigned to them
    if (session.user.role === 'distributor' && (order as any).distributorOrgId === session.user.organizationId) return order;
    // Clinic sees its org's orders + procurement sees all branches
    if (session.user.role === 'optic') {
        if (order.organizationId === session.user.organizationId) return order;
        // Procurement: also check parent/sibling orgs
        if (session.user.subRole === 'optic_procurement' && session.user.organizationId) {
            const userOrg = await prisma.organization.findUnique({ where: { id: session.user.organizationId }, select: { id: true, type: true, parentId: true } });
            if (userOrg) {
                const hqId = userOrg.type === 'headquarters' ? userOrg.id : userOrg.parentId;
                if (hqId) {
                    const branches = await prisma.organization.findMany({ where: { parentId: hqId }, select: { id: true } });
                    const allOrgIds = [hqId, ...branches.map((b: any) => b.id)];
                    if (order.organizationId && allOrgIds.includes(order.organizationId)) return order;
                }
            }
        }
    }
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
        comments: (order.comments as any[]) || [],
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
 * PATCH /api/orders/[id] — Edit order or forward to lab
 * - Doctor: edit while editable (new_order + within deadline)
 * - Distributor: can set labOrgId (forward to lab) on new_order
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

    const order = await findOrderWithAccess(params.id, session);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const body = await request.json();

    // Distributor forwarding to lab (set labOrgId)
    if (session.user.role === 'distributor' && body.labOrgId !== undefined) {
        if (order.status !== 'new_order') {
            return NextResponse.json({ error: 'Can only forward new orders' }, { status: 403 });
        }
        const updated = await prisma.order.update({
            where: { id: order.id },
            data: { labOrgId: body.labOrgId },
            include: { patient: true, organization: { select: { name: true } } },
        });
        return NextResponse.json(transformOrder(updated));
    }

    // Standard edit: check if editable
    if (order.status !== 'new_order') {
        return NextResponse.json({ error: 'Order is no longer editable' }, { status: 403 });
    }
    // Only urgent orders have an edit deadline
    if (order.isUrgent && order.editDeadline && new Date() >= order.editDeadline) {
        return NextResponse.json({ error: 'Edit window has expired' }, { status: 403 });
    }

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

/**
 * DELETE /api/orders/[id] — Admin (lab_head) permanently deletes an order
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

    // Only lab_head can permanently delete
    if (session.user.role !== 'laboratory' || session.user.subRole !== 'lab_head') {
        return NextResponse.json({ error: 'Only admin can delete orders' }, { status: 403 });
    }

    const { id } = await params;

    const order = await prisma.order.findFirst({
        where: { OR: [{ orderNumber: id }, { id }] }
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    try {
        // Try to delete ALL related records (no trace)
        try { await prisma.$executeRawUnsafe(`DELETE FROM "comments" WHERE "orderId" = $1`, order.id); } catch {}
        try { await prisma.$executeRawUnsafe(`DELETE FROM "defects" WHERE "orderId" = $1`, order.id); } catch {}
        try { await prisma.$executeRawUnsafe(`DELETE FROM "order_products" WHERE "orderId" = $1`, order.id); } catch {}
        try { await prisma.$executeRawUnsafe(`DELETE FROM "notifications" WHERE "orderId" = $1`, order.id); } catch {}
        
        // Delete the order
        await prisma.order.delete({ where: { id: order.id } });
        return NextResponse.json({ success: true, deleted: id });
    } catch (error: any) {
        console.error('DELETE order error:', error);
        return NextResponse.json({ error: 'Failed to delete order: ' + error.message }, { status: 500 });
    }
}
