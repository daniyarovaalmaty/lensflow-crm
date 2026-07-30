import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const user = await prisma.user.findUnique({ where: { email: 'reception_bala@lensflow.kz' }});
        return NextResponse.json({ user });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
