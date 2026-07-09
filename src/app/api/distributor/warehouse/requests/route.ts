import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requests = await prisma.stockRequest.findMany({
            where: {
                OR: [
                    { organizationId: session.user.organizationId },
                    { targetOrganizationId: session.user.organizationId }
                ]
            },
            include: {
                organization: { select: { name: true } },
                targetOrganization: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ requests });
    } catch (error) {
        console.error('Error fetching requests:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { targetOrganizationId, items, notes } = body;

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Товары не выбраны' }, { status: 400 });
        }

        const requestNumber = `REQ-${Date.now().toString().slice(-6)}`;

        const stockRequest = await prisma.stockRequest.create({
            data: {
                organizationId: session.user.organizationId,
                targetOrganizationId: targetOrganizationId || null,
                requestNumber,
                status: 'pending',
                items,
                notes,
                performedById: session.user.id,
                performedByName: session.user.name,
            }
        });

        return NextResponse.json({ success: true, request: stockRequest });
    } catch (error) {
        console.error('Error creating request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
