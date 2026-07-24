const fs = require('fs');

// Create the new API route
const apiRoute = `import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });
        
        const { orderIds, status } = await req.json();
        
        if (!Array.isArray(orderIds) || !status) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const result = await prisma.order.updateMany({
            where: { orderNumber: { in: orderIds } },
            data: { status, deliveredAt: status === 'delivered' ? new Date() : undefined }
        });

        return NextResponse.json({ updated: result.count });
    } catch (e: any) {
        console.error('Bulk update error', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
`;

fs.mkdirSync('src/app/api/orders/bulk-status', { recursive: true });
fs.writeFileSync('src/app/api/orders/bulk-status/route.ts', apiRoute);
console.log('Created bulk-status API');
