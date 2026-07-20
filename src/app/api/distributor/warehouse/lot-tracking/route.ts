import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const lotQuery = searchParams.get('lot');
        const productId = searchParams.get('productId');

        if (!lotQuery && !productId) {
            return NextResponse.json({ error: 'Укажите запрос для поиска' }, { status: 400 });
        }

        const whereClause: any = { organizationId: session.user.organizationId };
        
        if (productId) {
            whereClause.productId = productId;
        } else if (lotQuery) {
            if (lotQuery.length < 3) {
                return NextResponse.json({ error: 'Минимум 3 символа для поиска' }, { status: 400 });
            }
            whereClause.serialNumber = {
                contains: lotQuery,
                mode: 'insensitive'
            };
        }

        const stockItems = await prisma.stockItem.findMany({
            where: whereClause,
            include: {
                product: {
                    select: { name: true, sku: true, model: true }
                },
                wholesaleOrder: {
                    select: { 
                        orderNumber: true, 
                        createdAt: true, 
                        counterparty: { select: { name: true } }
                    }
                }
            },
            orderBy: {
                id: 'desc'
            },
            take: 100 // limit to 100 to prevent huge responses
        });

        const receiptDocIds = new Set<string>();
        stockItems.forEach(si => {
            if ((si as any).receiptDocId) receiptDocIds.add((si as any).receiptDocId);
        });

        let docMap = new Map();
        if (receiptDocIds.size > 0) {
            const docs = await prisma.stockDocument.findMany({
                where: { id: { in: Array.from(receiptDocIds) } },
                select: { id: true, documentNumber: true, counterpartyName: true, createdAt: true, notes: true }
            });
            docMap = new Map(docs.map(d => [d.id, d]));
        }

        const formattedItems = stockItems.map(si => {
            const receiptDocId = (si as any).receiptDocId;
            const receiptDoc = receiptDocId ? docMap.get(receiptDocId) : null;
            return {
                ...si,
                receiptDoc
            };
        });

        return NextResponse.json({ items: formattedItems });
    } catch (error) {
        console.error('Error in lot tracking:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
