export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// GET /api/distributors — list of active distributors (for optic order form)
export async function GET(_req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const distributors = await prisma.organization.findMany({
        where: { type: 'distributor', status: 'active' },
        select: { id: true, name: true, phone: true, email: true, city: true, address: true },
        orderBy: { name: 'asc' },
    });

    return NextResponse.json(distributors);
}
