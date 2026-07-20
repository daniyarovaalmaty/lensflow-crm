const { prisma } = require('./src/lib/prisma');
async function main() {
    const docs = await prisma.stockDocument.findMany({ where: { type: 'receipt', status: 'confirmed' } });
    for (const doc of docs) {
        if (!doc.items || !Array.isArray(doc.items))
            continue;
        for (const item of doc.items) {
            if (!item.batchBarcode)
                continue;
            const batch = await prisma.stockItem.findFirst({
                where: { organizationId: doc.organizationId, serialNumber: item.batchBarcode }
            });
            if (batch && batch.productId !== item.productId) {
                console.log('Mismatch found for barcode', item.batchBarcode);
                console.log('Doc product:', item.productId, 'Batch product:', batch.productId);
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
                console.log('Fixed barcode', item.batchBarcode);
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
