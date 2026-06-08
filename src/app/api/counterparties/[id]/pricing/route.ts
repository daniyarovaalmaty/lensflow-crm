export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * PUT /api/counterparties/[id]/pricing - Update organization discount or individual price list
 * Only lab_head and lab_admin can update
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
            return NextResponse.json({ error: 'Нет прав для изменения цен' }, { status: 403 });
        }

        const body = await request.json();
        const discountPercent = Number(body.discountPercent);
        const priceList = body.priceList || null; // Can be null to clear

        if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
            return NextResponse.json({ error: 'Скидка должна быть от 0 до 100%' }, { status: 400 });
        }

        const org = await prisma.organization.findUnique({
            where: { id: params.id },
            select: { metadata: true },
        });

        const existingMeta = (org?.metadata as any) || {};

        const updated = await prisma.organization.update({
            where: { id: params.id },
            data: { 
                discountPercent,
                metadata: {
                    ...existingMeta,
                    priceList,
                }
            },
            select: { id: true, name: true, discountPercent: true, metadata: true },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('PUT /api/counterparties/[id]/pricing error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
