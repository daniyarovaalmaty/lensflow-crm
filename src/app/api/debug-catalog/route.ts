import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const fields = ['id','name','category','sku','name1c','code','description','price','priceByDk','unit','isActive','sortOrder','createdAt','updatedAt'];
        const results: Record<string, string> = {};
        
        for (const field of fields) {
            try {
                await prisma.product.findFirst({ select: { [field]: true } });
                results[field] = 'OK';
            } catch (e: any) {
                results[field] = e.message?.substring(0, 100);
            }
        }

        let fullQuery = 'not tested';
        try {
            const p = await prisma.product.findMany({ take: 1 });
            fullQuery = `OK: ${p.length} products`;
        } catch (e: any) {
            fullQuery = e.message?.substring(0, 200);
        }

        return NextResponse.json({ fieldTests: results, fullQuery });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
