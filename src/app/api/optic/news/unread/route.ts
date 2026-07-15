import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/** Lightweight unread-news count for the QuickNav «Новости (+N)» badge. */
export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ unread: 0 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!me?.organizationId) return NextResponse.json({ unread: 0 });

    const org = await prisma.organization.findUnique({ where: { id: me.organizationId }, select: { type: true } });
    let orgIds: string[] = [me.organizationId];
    if (org?.type === 'headquarters') {
        const branches = await prisma.organization.findMany({ where: { parentId: me.organizationId, status: 'active' }, select: { id: true } });
        orgIds = [me.organizationId, ...branches.map((b) => b.id)];
    }

    const state = await prisma.newsReadState.findUnique({ where: { userId: me.id } });
    const since = state?.lastReadAt || new Date(0);
    const unread = await prisma.newsPost.count({
        where: {
            organizationId: { in: orgIds },
            createdAt: { gt: since },
            OR: [{ authorId: null }, { authorId: { not: me.id } }], // others' + system posts, not my own
        },
    });
    return NextResponse.json({ unread });
}
