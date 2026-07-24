import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

const ALLOWED_STATUSES = [
    'new_order', 'in_production', 'ready', 'rework',
    'shipped', 'out_for_delivery', 'delivered', 'cancelled'
];

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });
        
        const { orderIds, status } = await req.json();
        
        if (!Array.isArray(orderIds) || !status || orderIds.length === 0) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Validate status against whitelist to prevent arbitrary values
        if (!ALLOWED_STATUSES.includes(status)) {
            return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
        }

        // Validate orderIds are strings (prevent injection via non-string types)
        const safeOrderIds = orderIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
        if (safeOrderIds.length === 0) {
            return NextResponse.json({ error: 'No valid order IDs' }, { status: 400 });
        }

        // Use safe Prisma query instead of raw SQL string concatenation
        const result = await prisma.order.updateMany({
            where: { orderNumber: { in: safeOrderIds } },
            data: {
                status,
                ...(status === 'delivered' ? { deliveredAt: new Date() } : {}),
            },
        });

        return NextResponse.json({ updated: result.count });
    } catch (e: any) {
        console.error('Bulk update error', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

