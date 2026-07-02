import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const sales = await prisma.sale.findMany({
            where: {
                patientId: params.id,
                organizationId: session.user.organizationId || undefined,
            },
            orderBy: { createdAt: 'desc' },
            take: 20, // limit to 20 most recent purchases for the inline view
            include: {
                items: true,
            },
        });

        return NextResponse.json(sales);
    } catch (error: any) {
        console.error('Failed to fetch patient sales:', error);
        return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
    }
}
