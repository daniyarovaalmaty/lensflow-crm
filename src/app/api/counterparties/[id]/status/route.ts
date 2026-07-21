export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * PUT /api/counterparties/[id]/status - Soft delete / Block counterparty
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'laboratory') {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        
        if (session.user.subRole !== 'lab_head' && session.user.subRole !== 'lab_admin') {
            return NextResponse.json({ error: 'Нет прав для изменения статуса' }, { status: 403 });
        }

        const body = await request.json();
        const { type, status } = body; // status can be 'active' or 'blocked'

        if (type === 'clinic') {
            const updated = await prisma.organization.update({
                where: { id: params.id },
                data: { status: status === 'blocked' ? 'blocked' : 'active' }
            });
            return NextResponse.json(updated);
        } else if (type === 'doctor') {
            // For a doctor that is a real user
            const updated = await prisma.user.update({
                where: { id: params.id },
                data: { status: status === 'blocked' ? 'blocked' : 'active' }
            });
            return NextResponse.json(updated);
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

    } catch (error) {
        console.error('PUT /api/counterparties/[id]/status error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
