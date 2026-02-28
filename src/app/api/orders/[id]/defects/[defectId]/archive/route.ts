export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * PATCH /api/orders/[id]/defects/[defectId]/archive
 * Toggle archived status on a defect record
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; defectId: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const { id: orderNumber, defectId } = params;
        const body = await request.json();

        const order = await prisma.order.findUnique({ where: { orderNumber } });
        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        const defects = (order.defects as any[]) || [];
        const defect = defects.find((d: any) => d.id === defectId);
        if (!defect) return NextResponse.json({ error: 'Defect not found' }, { status: 404 });

        defect.archived = body.archived ?? !defect.archived;

        await prisma.order.update({
            where: { id: order.id },
            data: { defects },
        });

        return NextResponse.json({ defect });
    } catch (error: any) {
        console.error('PATCH archive error:', error);
        return NextResponse.json({ error: 'Failed to update defect' }, { status: 500 });
    }
}
