import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const count = await prisma.order.count({
            where: { source: 'itigris' }
        });
        return NextResponse.json({ count });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
