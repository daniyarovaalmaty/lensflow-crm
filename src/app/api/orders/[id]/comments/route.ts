import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// POST — add a comment to an order
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text?.trim()) {
        return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Build comment object
    const comment = {
        authorId: session.user.id,
        authorName: session.user.name || session.user.email || 'Unknown',
        role: session.user.role,
        subRole: session.user.subRole,
        text: text.trim(),
        createdAt: new Date().toISOString(),
    };

    // Append to existing comments
    const existing = (order.comments as any[]) || [];
    const updatedComments = [...existing, comment];

    // If an engineer/lab user is commenting — extend editDeadline so doctor can edit
    const isLabUser = session.user.role === 'laboratory';
    const updateData: any = { comments: updatedComments };

    if (isLabUser) {
        // Give doctor 24 hours to edit the order
        const newDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
        updateData.editDeadline = newDeadline;

        // If order was in production or beyond, return to "new" so doctor can edit
        if (order.status !== 'new_order') {
            updateData.status = 'new_order';
        }
    }

    const updated = await prisma.order.update({
        where: { id },
        data: updateData,
    });

    // Format response
    const formatOrder = (o: any) => ({
        id: o.id,
        order_id: o.orderNumber,
        status: o.status === 'new_order' ? 'new' : o.status,
        comments: o.comments || [],
        edit_deadline: o.editDeadline?.toISOString(),
    });

    return NextResponse.json({ comment, order: formatOrder(updated) }, { status: 201 });
}
