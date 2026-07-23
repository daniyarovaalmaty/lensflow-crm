import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    let output = '';
    const docs = await prisma.stockDocument.findMany({ where: { type: 'receipt', status: 'confirmed' } });
    for (const doc of docs) {
        if (!doc.items || !Array.isArray(doc.items as any[])) continue;
        for (const item of (doc.items as any[])) {
            if (!item.batchBarcode) continue;
            
            const batch = await prisma.stockItem.findFirst({
                where: { organizationId: doc.organizationId, serialNumber: item.batchBarcode }
            });
            
            if (batch && batch.productId !== item.productId) {
                output += `Mismatch found for barcode ${item.batchBarcode}\n`;
                output += `Doc product: ${item.productId}, Batch product: ${batch.productId}\n`;
                
                // Deduct from old
                await prisma.opticProduct.update({
                    where: { id: batch.productId },
                    data: { currentStock: { decrement: batch.quantity } }
                });
                
                // Add to new
                await prisma.opticProduct.update({
                    where: { id: item.productId },
                    data: { currentStock: { increment: batch.quantity } }
                });
                
                // Update batch
                await prisma.stockItem.update({
                    where: { id: batch.id },
                    data: { productId: item.productId }
                });
                
                // Update movements
                await prisma.stockMovement.updateMany({
                    where: { documentId: doc.id, organizationId: doc.organizationId, productId: batch.productId },
                    data: { productId: item.productId }
                });
                
                output += `Fixed barcode ${item.batchBarcode}\n`;
            }
        }
    }
    return NextResponse.json({ success: true, output });
}
