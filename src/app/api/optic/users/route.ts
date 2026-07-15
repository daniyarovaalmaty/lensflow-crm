import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/optic/users — colleagues in the current org (+ branches if HQ).
 * Used by the task assignee picker; available to any authenticated optic user.
 */
export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!me?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const org = await prisma.organization.findUnique({
        where: { id: me.organizationId },
        select: { type: true },
    });
    let orgIds: string[] = [me.organizationId];
    if (org?.type === 'headquarters') {
        const branches = await prisma.organization.findMany({
            where: { parentId: me.organizationId, status: 'active' },
            select: { id: true },
        });
        orgIds = [me.organizationId, ...branches.map((b) => b.id)];
    }

    const users = await prisma.user.findMany({
        where: { organizationId: { in: orgIds }, status: 'active' },
        select: { id: true, fullName: true, email: true, subRole: true },
        orderBy: { fullName: 'asc' },
    });

    return NextResponse.json(users);
}
