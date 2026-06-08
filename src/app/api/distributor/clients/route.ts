export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'distributor') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const orgId = session.user.organizationId;
        if (!orgId) {
            return NextResponse.json([]);
        }

        const clients = await prisma.organization.findMany({
            where: { defaultLabId: orgId },
            select: {
                id: true,
                name: true,
                inn: true,
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(clients);
    } catch (error) {
        console.error('GET /api/distributor/clients error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
