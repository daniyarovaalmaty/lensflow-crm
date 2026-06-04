import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Test with explicit select (workaround)
        let selectResult = 'not tested';
        try {
            const p = await prisma.product.findMany({
                take: 2,
                select: {
                    id: true, name: true, category: true, sku: true, name1c: true,
                    code: true, description: true, price: true, priceByDk: true,
                    unit: true, isActive: true, sortOrder: true, createdAt: true, updatedAt: true,
                },
            });
            selectResult = `OK: ${p.length} products. Sample: ${p[0]?.name || 'none'}`;
        } catch (e: any) {
            selectResult = e.message?.substring(0, 200);
        }

        // Test without select (known broken)
        let noSelectResult = 'not tested';
        try {
            const p = await prisma.product.findMany({ take: 1 });
            noSelectResult = `OK: ${p.length} products`;
        } catch (e: any) {
            noSelectResult = e.message?.substring(0, 200);
        }

        return NextResponse.json({ 
            withSelect: selectResult, 
            withoutSelect: noSelectResult,
            prismaVersion: require('@prisma/client').Prisma.prismaVersion?.client || 'unknown',
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
