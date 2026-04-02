import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

type CommentType = 'comment' | 'request_edit' | 'request_cancel' | 'approve_edit' | 'approve_cancel' | 'reject_request';

// POST — add a comment to an order
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { text, type = 'comment' } = body as { text: string; type?: CommentType };

    if (!text?.trim()) {
        return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const isLabUser = session.user.role === 'laboratory';
    const isDoctorUser = session.user.role === 'optic' || session.user.role === 'doctor';

    // Validate: only doctors can request, only lab can approve/reject
    if (['request_edit', 'request_cancel'].includes(type) && !isDoctorUser) {
        return NextResponse.json({ error: 'Only doctors can create requests' }, { status: 403 });
    }
    if (['approve_edit', 'approve_cancel', 'reject_request'].includes(type) && !isLabUser) {
        return NextResponse.json({ error: 'Only lab can approve/reject' }, { status: 403 });
    }

    // Build comment object
    const comment = {
        authorId: session.user.id,
        authorName: session.user.name || session.user.email || 'Unknown',
        role: session.user.role,
        subRole: session.user.subRole,
        type,
        text: text.trim(),
        createdAt: new Date().toISOString(),
    };

    // Append to existing comments
    const existing = (order.comments as any[]) || [];
    const updatedComments = [...existing, comment];

    const updateData: any = { comments: updatedComments };

    // Handle approve_edit: reset status to new_order + extend deadline 24h
    if (type === 'approve_edit' && isLabUser) {
        updateData.editDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
        if (order.status !== 'new_order') {
            updateData.status = 'new_order';
        }
    }

    // Handle approve_cancel: set status to cancelled
    if (type === 'approve_cancel' && isLabUser) {
        updateData.status = 'cancelled';
    }

    // Handle regular lab comment (existing behavior): extend deadline + reset status
    if (type === 'comment' && isLabUser) {
        updateData.editDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
