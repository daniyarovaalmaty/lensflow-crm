import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// GET — list tickets (own or all for lab_head)
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = session.user.role === 'laboratory' || session.user.subRole === 'lab_head' || session.user.subRole === 'lab_admin';

    const tickets = await prisma.supportTicket.findMany({
        where: isAdmin ? {} : { authorId: session.user.id },
        include: {
            author: { select: { id: true, fullName: true, email: true, role: true, subRole: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tickets, isAdmin });
}

// POST — create a new ticket
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, description, category, priority } = body;

    if (!title?.trim() || !description?.trim()) {
        return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
        data: {
            title: title.trim(),
            description: description.trim(),
            category: category || 'feature',
            priority: priority || 'normal',
            authorId: session.user.id,
        },
        include: {
            author: { select: { id: true, fullName: true, email: true, role: true, subRole: true } },
        },
    });

    return NextResponse.json(ticket, { status: 201 });
}
