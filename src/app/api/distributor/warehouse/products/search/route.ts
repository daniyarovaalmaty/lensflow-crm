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
        
        const translatedBarcode = barcodeQuery ? translateCyrillicToEnglishLayout(barcodeQuery) : '';
        const barcodeQueries = barcodeQuery ? [barcodeQuery] : [];
        if (translatedBarcode && translatedBarcode !== barcodeQuery) barcodeQueries.push(translatedBarcode);

        const conditions: any[] = [{ organizationId: session.user.organizationId }];

        if (nameQuery) {
            conditions.push({ name: { contains: nameQuery, mode: 'insensitive' as const } });
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

        const products = await prisma.opticProduct.findMany({
            where: {
                AND: conditions
            },
            include: {
                stockItems: {
                    where: { quantity: { gt: 0 } }
                }
            },
            take: 10,
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ products });
    } catch (error) {
        console.error('Error searching products:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
