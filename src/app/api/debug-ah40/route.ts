import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const order = await prisma.order.findUnique({
        where: { orderNumber: 'AH40' }
    });
    
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: 'Герберсгаген' } }
    });
    
    return NextResponse.json({ order, user });
}
