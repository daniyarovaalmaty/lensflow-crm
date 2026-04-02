export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * POST /api/merge-doctors — Merge "Доктор New Eye" into "Айгерим Аскаровна"
 * One-time admin endpoint
 */
export async function GET() { return merge(); }
export async function POST() { return merge(); }

async function merge() {
    const session = await auth();
    if (!session?.user || session.user.subRole !== 'lab_head') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Find orders with "New Eye" in doctorName
    const newEyeOrders = await prisma.order.findMany({
        where: { doctorName: { contains: 'New Eye', mode: 'insensitive' } },
        select: { id: true, orderNumber: true, doctorName: true, createdById: true, organizationId: true },
    });

    // Find Айгерим's orders to get her user ID and org
    const aigOrders = await prisma.order.findMany({
        where: { doctorName: { contains: 'Айгерим', mode: 'insensitive' } },
        select: { id: true, orderNumber: true, doctorName: true, createdById: true, organizationId: true },
        take: 1,
    });

    if (newEyeOrders.length === 0) {
        return NextResponse.json({ message: 'No "New Eye" orders found', newEyeOrders: [] });
    }

    const targetName = aigOrders[0]?.doctorName || 'Айгерим Аскаровна';
    const targetCreatedById = aigOrders[0]?.createdById;
    const targetOrgId = aigOrders[0]?.organizationId;

    const results = [];
    for (const order of newEyeOrders) {
        const updateData: any = { doctorName: targetName };
        if (targetCreatedById) updateData.createdById = targetCreatedById;
        if (targetOrgId) updateData.organizationId = targetOrgId;

        await prisma.order.update({ where: { id: order.id }, data: updateData });
        results.push({ orderNumber: order.orderNumber, from: order.doctorName, to: targetName });
    }

    return NextResponse.json({ merged: results.length, details: results });
}
