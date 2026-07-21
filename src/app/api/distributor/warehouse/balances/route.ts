import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const products = await prisma.opticProduct.findMany({
            where: {
                organizationId: session.user.organizationId,
                // Optional: add isActive: true, etc.
            },
            select: {
                id: true,
                name: true,
                sku: true,
                trackSerials: true,
                currentStock: true,
                unit: true,
                purchasePrice: true,
                retailPrice: true,
                brand: true,
                model: true,
                barcode: true,
                specs: true,
                stockItems: {
                    where: { quantity: { gt: 0 } },
                    select: { 
                        id: true,
                        serialNumber: true, 
                        quantity: true,
                        expiryDate: true,
                        productionDate: true,
                        importDate: true,
                        diopters: true,
                        receiptDocId: true,
                        purchasePrice: true
                    },
                    orderBy: { expiryDate: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });

        const receiptDocIds = new Set<string>();
        products.forEach(p => p.stockItems.forEach(si => {
            if (si.receiptDocId) receiptDocIds.add(si.receiptDocId);
        }));

        const docs = await prisma.stockDocument.findMany({
            where: { id: { in: Array.from(receiptDocIds) } },
            select: { id: true, documentNumber: true }
        });
        const docMap = new Map(docs.map(d => [d.id, d.documentNumber]));

        const mappedProducts = products.map(p => ({
            ...p,
            stockItems: p.stockItems.map(si => ({
                ...si,
                receiptDocNumber: si.receiptDocId ? docMap.get(si.receiptDocId) : null
            }))
        }));

        return NextResponse.json({ products: mappedProducts });
    } catch (error) {
        console.error('Error fetching balances:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
