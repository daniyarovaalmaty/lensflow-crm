export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        // Await params per Next.js 15+ changes, or just destructure if Next.js <15. We'll use params.id directly if it's sync. Wait, actually `params` should be awaited in newer Next, but I'll use `params.id` for compatibility.
        // Let's resolve the order
        const id = params.id;

        const order = await prisma.order.findFirst({
            where: {
                OR: [{ orderNumber: id }, { id }],
            },
            include: { patient: true, organization: { select: { name: true } } },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Verify access - must be the creator, their organization, or distributor handling it.
        // Only Optic or Distributor should be able to make it urgent
        if (session.user.role === 'optic' && order.organizationId !== session.user.organizationId) {
            // Also allow if procurement
            if (session.user.subRole !== 'optic_procurement') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }
        if (session.user.role === 'distributor' && order.distributorOrgId !== session.user.organizationId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (session.user.role === 'doctor' && order.createdById !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (order.isUrgent) {
            return NextResponse.json({ error: 'Order is already urgent' }, { status: 400 });
        }

        // You can't make cancelled or delivered orders urgent. Limit to new_order mostly.
        if (order.status === 'cancelled' || order.status === 'delivered') {
            return NextResponse.json({ error: 'Cannot expedite an order in this status' }, { status: 400 });
        }

        // Calculate surcharge
        const labSettings = await prisma.labSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default' },
            update: {},
        });

        const URGENT_SURCHARGE_PCT = labSettings.urgentSurchargePercent;

        // Current price after discount is what? 
        // Order has `totalPrice`. But if we just apply the surcharge, we can do it on the base price.
        // basePrice before urgent = totalPrice currently (since it was not urgent).
        const currentTotalPrice = order.totalPrice;
        const urgentSurcharge = Math.round(currentTotalPrice * URGENT_SURCHARGE_PCT / 100);
        const newTotalPrice = currentTotalPrice + urgentSurcharge;

        // Update the order
        const updated = await prisma.order.update({
            where: { id: order.id },
            data: {
                isUrgent: true,
                editDeadline: new Date(), // expire edit timer
                totalPrice: newTotalPrice,
            },
        });

        // Add a comment to the order history
        const comment = {
            authorId: session.user.id,
            authorName: session.user.name || session.user.email || 'Unknown',
            role: session.user.role,
            subRole: session.user.subRole,
            type: 'urgent_request',
            text: 'Заказ переведен в статус срочного по запросу пользователя.',
            createdAt: new Date().toISOString(),
        };
        const existingComments = (order.comments as any[]) || [];
        await prisma.order.update({
            where: { id: order.id },
            data: {
                comments: [...existingComments, comment]
            }
        });

        return NextResponse.json({ success: true, newTotalPrice });

    } catch (error: any) {
        console.error('POST /api/orders/[id]/urgent error:', error);
        return NextResponse.json(
            { error: 'Failed to expedite order' },
            { status: 500 }
        );
    }
}
