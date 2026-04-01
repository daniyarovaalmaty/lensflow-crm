import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// PATCH — update ticket status + admin comment (lab_head / lab_admin only)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = session.user.subRole === 'lab_head' || session.user.subRole === 'lab_admin';
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { status, adminComment } = body;

    const data: any = {};
    if (status) data.status = status;
    if (adminComment !== undefined) data.adminComment = adminComment;

    const ticket = await prisma.supportTicket.update({
        where: { id },
        data,
        include: {
            author: { select: { id: true, fullName: true, email: true, role: true, subRole: true } },
        },
    });

    return NextResponse.json(ticket);
}
