export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * PATCH /api/counterparties/[id]/discount - Update doctor personal discount
 * Only lab_head can update
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== 'laboratory') {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        if (session.user.subRole !== 'lab_head') {
            return NextResponse.json({ error: 'Только руководитель лаборатории может менять скидку' }, { status: 403 });
        }

        const body = await request.json();
        const discount = Number(body.discountPercent);

        if (isNaN(discount) || discount < 0 || discount > 100) {
            return NextResponse.json({ error: 'Скидка должна быть от 0 до 100%' }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: params.id },
            data: { discountPercent: discount },
            select: { id: true, fullName: true, discountPercent: true },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('PATCH /api/counterparties/[id]/discount error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
