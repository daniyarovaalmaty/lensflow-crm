import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const pendingSales = await prisma.sale.findMany({
        where: { 
            organizationId: user.organizationId,
            paymentStatus: 'unpaid'
        },
        include: { items: true, patient: true },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(pendingSales);
}
