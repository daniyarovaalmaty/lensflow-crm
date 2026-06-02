import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// GET /api/labs — list all laboratory organizations
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const labs = await prisma.organization.findMany({
        where: { type: 'laboratory', status: 'active' },
        select: { id: true, name: true, phone: true, email: true, city: true, address: true },
        orderBy: { name: 'asc' },
    });

    return NextResponse.json(labs);
}
