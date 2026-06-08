import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const labs = await prisma.organization.findMany({
            where: { type: 'laboratory' },
            select: { id: true, name: true },
        });

        return NextResponse.json(labs);
    } catch (error) {
        console.error('GET /api/laboratories error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
