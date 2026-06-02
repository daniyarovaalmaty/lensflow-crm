import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// POST /api/orders/[id]/send-to-lab
// Distributor sends an order to a laboratory
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return NextResponse.json({ error: 'Only distributors can send orders to lab' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { labOrgId } = body;

    if (!labOrgId) {
        return NextResponse.json({ error: 'labOrgId is required' }, { status: 400 });
    }

    // Find order assigned to this distributor
    const order = await prisma.order.findFirst({
        where: {
            OR: [{ orderNumber: id }, { id }],
            distributorOrgId: session.user.organizationId,
        },
    });

    if (!order) {
        return NextResponse.json({ error: 'Order not found or access denied' }, { status: 404 });
    }

    // Verify lab exists and is type=laboratory
    const lab = await prisma.organization.findFirst({
        where: { id: labOrgId, type: 'laboratory' },
        select: { id: true, name: true },
    });

    if (!lab) {
        return NextResponse.json({ error: 'Laboratory not found' }, { status: 404 });
    }

    // Update order with labOrgId
    const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
            labOrgId,
            // Add a comment about forwarding
            comments: [
                ...(Array.isArray(order.comments) ? (order.comments as any[]) : []),
                {
                    authorId: session.user.id,
                    authorName: session.user.profile?.fullName || 'Дистрибьютор',
                    role: 'distributor',
                    text: `Заказ направлен в лабораторию: ${lab.name}`,
                    createdAt: new Date().toISOString(),
                }
            ],
        },
        select: { id: true, orderNumber: true, labOrgId: true, status: true },
    });

    return NextResponse.json({
        success: true,
        order: updated,
        lab: lab,
    });
}
