export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

const AddDefectSchema = z.object({
    qty: z.number().int().min(1, 'Количество должно быть не менее 1'),
    note: z.string().optional(),
});

/**
 * POST /api/orders/[id]/defects - Add a defect record to an order
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const body = await request.json();
        const validatedData = AddDefectSchema.parse(body);

        const order = await prisma.order.findUnique({ where: { orderNumber: params.id } });
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const allowedStatuses = ['in_production', 'ready', 'rework'];
        if (!allowedStatuses.includes(order.status)) {
            return NextResponse.json(
                { error: 'Defects can only be added during production, ready, or rework stage' },
                { status: 400 }
            );
        }

        // Create defect record
        const defect = {
            id: `DEF-${Date.now().toString(36).toUpperCase()}`,
            qty: validatedData.qty,
            date: new Date().toISOString(),
            note: validatedData.note || undefined,
        };

        const existingDefects = (order.defects as any[]) || [];
        existingDefects.push(defect);

        const updated = await prisma.order.update({
            where: { id: order.id },
            data: { defects: existingDefects },
        });

        return NextResponse.json({ defect, order_id: updated.orderNumber }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/orders/[id]/defects error:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: 'Failed to add defect' }, { status: 500 });
    }
}
