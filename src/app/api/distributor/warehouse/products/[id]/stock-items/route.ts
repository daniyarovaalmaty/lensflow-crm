import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const productId = params.id;
        
        const stockItems = await prisma.stockItem.findMany({
            where: {
                productId,
                organizationId: session.user.organizationId,
                status: 'in_stock'
            },
            orderBy: { receivedAt: 'desc' }
        });

        return NextResponse.json({ stockItems });
    } catch (error) {
        console.error('Error fetching stock items:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
