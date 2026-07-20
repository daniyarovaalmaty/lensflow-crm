import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const nameQuery = searchParams.get('name') || '';
        const skuQuery = searchParams.get('sku') || '';
        const barcodeQuery = searchParams.get('barcode') || '';
        const q = searchParams.get('q') || '';
        
        const translatedBarcode = barcodeQuery ? translateCyrillicToEnglishLayout(barcodeQuery) : '';
        const barcodeQueries = barcodeQuery ? [barcodeQuery] : [];
        if (translatedBarcode && translatedBarcode !== barcodeQuery) barcodeQueries.push(translatedBarcode);

        const conditions: any[] = [{ organizationId: session.user.organizationId }];

        if (q) {
            const translatedQ = translateCyrillicToEnglishLayout(q);
            const qQueries = [q];
            if (translatedQ !== q) qQueries.push(translatedQ);
            
            conditions.push({
                OR: [
                    { name: { contains: q, mode: 'insensitive' as const } },
                    { model: { contains: q, mode: 'insensitive' as const } },
                    { sku: { contains: q, mode: 'insensitive' as const } },
                    ...qQueries.flatMap(bq => [
                        { barcode: { contains: bq, mode: 'insensitive' as const } },
                        { stockItems: { some: { barcode: { contains: bq, mode: 'insensitive' as const } } } },
                        { stockItems: { some: { serialNumber: { contains: bq, mode: 'insensitive' as const } } } }
                    ])
                ]
            });
        } else {
            if (nameQuery) {
                conditions.push({ 
                    OR: [
                        { name: { contains: nameQuery, mode: 'insensitive' as const } },
                        { model: { contains: nameQuery, mode: 'insensitive' as const } }
                    ]
                });
            }
            if (skuQuery) {
                conditions.push({ sku: { contains: skuQuery, mode: 'insensitive' as const } });
            }
            if (barcodeQueries.length > 0) {
                conditions.push({
                    OR: barcodeQueries.flatMap(bq => [
                        { barcode: { contains: bq, mode: 'insensitive' as const } },
                        { stockItems: { some: { barcode: { contains: bq, mode: 'insensitive' as const } } } },
                        { stockItems: { some: { serialNumber: { contains: bq, mode: 'insensitive' as const } } } }
                    ])
                });
            }
        }

        const products = await prisma.opticProduct.findMany({
            where: {
                AND: conditions
            },
            include: {
                stockItems: {
                    where: { quantity: { gt: 0 } }
                }
            },
            take: 20, // Increase take limit to show more default products
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ products });
    } catch (error) {
        console.error('Error searching products:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
