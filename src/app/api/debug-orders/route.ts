import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const org = await prisma.organization.findFirst({
            where: { name: 'Оптика Народная' }
        });
        if (!org) return NextResponse.json({ error: 'Org not found' });

        const order = await prisma.order.findFirst({
            where: { organizationId: org.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ org, order });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
