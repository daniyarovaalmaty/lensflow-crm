import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/distributor/pricelist — get distributor's custom price list
 */
export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId! },
        select: { metadata: true },
    });

    const priceList = (org?.metadata as any)?.priceList || null;
    return NextResponse.json({ priceList });
}

/**
 * PUT /api/distributor/pricelist — update distributor's custom price list
 */
export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Only dist_head can update prices
    if (session.user.subRole !== 'dist_head' && session.user.subRole !== 'dist_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { priceList } = body;

    const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId! },
        select: { metadata: true },
    });

    const existingMeta = (org?.metadata as any) || {};

    await prisma.organization.update({
        where: { id: session.user.organizationId! },
        data: {
            metadata: {
                ...existingMeta,
                priceList,
            },
        },
    });

    return NextResponse.json({ success: true, priceList });
}
