import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const columns = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'products';
        `;
        
        let findManyResult: any = null;
        let findManyError: any = null;
        try {
            const products = await prisma.product.findMany({ take: 2 });
            findManyResult = { count: products.length, sample: products };
        } catch (e2: any) {
            findManyError = e2.message;
        }

        const rawProducts = await prisma.$queryRaw`SELECT id, name, category FROM products LIMIT 3`;
        
        return NextResponse.json({ columns, findManyResult, findManyError, rawProducts });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
