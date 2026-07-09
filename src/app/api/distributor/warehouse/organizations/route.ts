import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all organizations except the current one (or based on business rules)
        // Usually, a distributor can transfer to their own branches or optics they serve.
        // For simplicity, returning all active orgs except self.
        const organizations = await prisma.organization.findMany({
            where: {
                id: { not: session.user.organizationId },
                status: 'active'
            },
            select: {
                id: true,
                name: true,
                type: true,
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ organizations });
    } catch (error) {
        console.error('Error fetching organizations:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
