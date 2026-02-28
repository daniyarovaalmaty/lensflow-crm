export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/organizations - List all organizations (for lab_head)
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'laboratory') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const orgs = await prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                discountPercent: true,
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(orgs);
    } catch (error) {
        console.error('GET /api/organizations error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
