import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const products = await prisma.product.findMany({ where: { category: 'lens' } });
    return NextResponse.json(products);
}
