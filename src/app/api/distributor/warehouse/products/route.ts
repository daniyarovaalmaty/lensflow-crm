import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { 
            name, 
            sku, 
            barcode, 
            brand,
            model,
            diopters,
            percentage,
            expirationDate,
            importDate,
            productionDate,
            receiptDoc,
            refCode,
            lot,
            trackSerials, 
            purchasePrice, 
            category 
        } = body;

        if (!name) {
            return NextResponse.json({ error: 'Имя продукта обязательно' }, { status: 400 });
        }

        const specs = {
            diopters: diopters || '',
            percentage: percentage || '',
            expirationDate: expirationDate || '',
            importDate: importDate || '',
            productionDate: productionDate || '',
            receiptDoc: receiptDoc || '',
            refCode: refCode || '',
            lot: lot || '',
        };

        const product = await prisma.opticProduct.create({
            data: {
                organizationId: session.user.organizationId,
                name,
                sku: sku || `SKU-${Date.now()}`, // auto-generate if empty
                barcode: barcode || null,
                brand: brand || null,
                model: model || null,
                specs,
                trackSerials: Boolean(trackSerials),
                purchasePrice: purchasePrice ? Number(purchasePrice) : 0,
                category: category || 'product',
                currentStock: 0,
            }
        });

        return NextResponse.json({ success: true, product });
    } catch (error) {
        console.error('Error creating product:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
