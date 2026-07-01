import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// GET /api/organizations/branches
// Returns branches of the current user's organization (for procurement users)
// Also includes routing config (default recipient per branch) from HQ metadata
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    if (!orgId) {
        return NextResponse.json([], { status: 200 });
    }

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, type: true, parentId: true, metadata: true },
    });

    if (!org) return NextResponse.json([], { status: 200 });

    let branches: { id: string; name: string; recipientType?: string; recipientOrgId?: string }[] = [];
    let hqMetadata: any = null;

    if (org.type === 'headquarters') {
        hqMetadata = org.metadata as any;
        const children = await prisma.organization.findMany({
            where: { parentId: orgId, type: 'branch' },
            select: { id: true, name: true, inn: true, deliveryAddress: true, address: true, directorName: true },
            orderBy: { name: 'asc' },
        });
        branches = children;
    } else if (org.type === 'branch' && org.parentId) {
        // Load HQ for routing config
        const hq = await prisma.organization.findUnique({
            where: { id: org.parentId },
            select: { metadata: true },
        });
        hqMetadata = hq?.metadata as any;

        const siblings = await prisma.organization.findMany({
            where: { parentId: org.parentId, type: 'branch' },
            select: { id: true, name: true, inn: true, deliveryAddress: true, address: true, directorName: true },
            orderBy: { name: 'asc' },
        });
        branches = siblings;
    } else {
        const orgFull = await prisma.organization.findUnique({ where: { id: org.id } });
        branches = [{ id: org.id, name: org.name, inn: orgFull?.inn, deliveryAddress: orgFull?.deliveryAddress, address: orgFull?.address, directorName: orgFull?.directorName }] as any;
    }

    // Inject routing config into each branch
    const branchRouting = hqMetadata?.branchRouting || {};
    const result = branches.map(b => ({
        ...b,
        recipientType: branchRouting[b.id]?.recipientType || 'laboratory',
        recipientOrgId: branchRouting[b.id]?.recipientOrgId || null,
        recipientLabel: branchRouting[b.id]?.label || 'Лаборатория',
    }));

    return NextResponse.json(result);
}
