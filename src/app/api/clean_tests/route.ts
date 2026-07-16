import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

import { auth } from '@/auth';

export async function GET() {
    try {
        const session = await auth();
        const organizationId = session?.user?.organizationId;
        if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const products = await prisma.opticProduct.findMany({
            where: { name: { startsWith: 'test' }, organizationId: organizationId }
        });
        
        const docs = await prisma.stockDocument.findMany({
            where: { OR: [ { documentNumber: { startsWith: 'test' } }, { documentNumber: '12' }, { documentNumber: '1' } ], organizationId: organizationId }
        });

        const productIds = products.map(p => p.id);
        const docIds = docs.map(d => d.id);

        if (productIds.length > 0) {
            await prisma.stockMovement.deleteMany({
                where: { productId: { in: productIds }, organizationId: organizationId }
            });
            await prisma.opticProduct.deleteMany({
                where: { id: { in: productIds }, organizationId: organizationId }
            });
        }

        if (docIds.length > 0) {
            await prisma.stockMovement.deleteMany({
                where: { documentId: { in: docIds }, organizationId: organizationId }
            });
            await prisma.stockDocument.deleteMany({
                where: { id: { in: docIds }, organizationId: organizationId }
            });
        }

        return NextResponse.json({ success: true, products: productIds, docs: docIds });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
