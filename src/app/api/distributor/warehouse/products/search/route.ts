import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q') || '';

        const products = await prisma.opticProduct.findMany({
            where: {
                organizationId: session.user.organizationId,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { sku: { contains: query, mode: 'insensitive' } },
                ]
            },
            take: 10, // Limit results
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ products });
    } catch (error) {
        console.error('Error searching products:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
