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
                        diopters: true
                    },
                    orderBy: { expiryDate: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ products });
    } catch (error) {
        console.error('Error fetching balances:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
