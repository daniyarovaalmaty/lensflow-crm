import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// GET /api/organizations/branches
// Returns branches of the current user's organization (for procurement users)
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    if (!orgId) {
        return NextResponse.json([], { status: 200 });
    }

    // Find branches: either direct children or siblings (if user is in a branch)
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, type: true, parentId: true },
    });

    if (!org) return NextResponse.json([], { status: 200 });

    let branches: { id: string; name: string }[] = [];

    if (org.type === 'headquarters') {
        // Return all child branches
        const children = await prisma.organization.findMany({
            where: { parentId: orgId, type: 'branch' },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
        branches = children;
    } else if (org.type === 'branch' && org.parentId) {
        // Return all sibling branches (same parent)
        const siblings = await prisma.organization.findMany({
            where: { parentId: org.parentId, type: 'branch' },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
        branches = siblings;
    } else {
        branches = [{ id: org.id, name: org.name }];
    }

    return NextResponse.json(branches);
}
