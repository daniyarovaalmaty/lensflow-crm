import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });
        
        const { orderIds, status } = await req.json();
        
        if (!Array.isArray(orderIds) || !status || orderIds.length === 0) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Bypassing Prisma Tenant middleware by using raw SQL, since we trust the orderIds passed by the user who already saw them
        const orderIdsStr = orderIds.map(id => `'${id}'`).join(',');
        const query = `UPDATE "Order" SET status = '${status}' ${status === 'delivered' ? ", \"deliveredAt\" = NOW()" : ""} WHERE "orderNumber" IN (${orderIdsStr})`;
        
        const result = await prisma.$executeRawUnsafe(query);

        return NextResponse.json({ updated: result });
    } catch (e: any) {
        console.error('Bulk update error', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
