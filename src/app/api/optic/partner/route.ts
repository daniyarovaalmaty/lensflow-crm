import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userOrgId = session.user.organizationId;
        if (!userOrgId) {
            return NextResponse.json({ error: 'No organization linked' }, { status: 400 });
        }

        // Fetch user's organization
        const organization = await prisma.organization.findUnique({
            where: { id: userOrgId },
            select: { id: true, name: true, defaultLabId: true, discountPercent: true }
        });

        // Fetch all laboratories
        const laboratories = await prisma.organization.findMany({
            where: { type: 'laboratory' },
            select: { id: true, name: true }
        });

        // Fetch products (catalog)
        const products = await prisma.product.findMany({
            where: { isActive: true },
            orderBy: [{ category: 'asc' }, { name: 'asc' }]
        });

        return NextResponse.json({
            organization,
            laboratories,
            products
        });
    } catch (error) {
        console.error('GET /api/optic/partner Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userOrgId = session.user.organizationId;
        if (!userOrgId) {
            return NextResponse.json({ error: 'No organization linked' }, { status: 400 });
        }

        const body = await req.json();
        const { labId } = body;

        // If labId is null/empty, we un-link.
        const updatedOrg = await prisma.organization.update({
            where: { id: userOrgId },
            data: {
                defaultLabId: labId || null
            }
        });

        return NextResponse.json(updatedOrg);
    } catch (error) {
        console.error('POST /api/optic/partner Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
