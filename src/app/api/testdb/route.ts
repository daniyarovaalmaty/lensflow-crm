export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
    const docs = await prisma.user.findMany({
        select: { id: true, fullName: true, role: true, subRole: true, organizationId: true, organization: { select: { name: true } } }
    });
    return NextResponse.json(docs);
}
