import { prisma } from './src/lib/db/prisma';

async function main() {
    const orgId = 'cl...'; // not needed, I will just run it for all or search for the user
    
    const user = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    
    if (!user || !user.organizationId) {
        console.log('User or organization not found.');
        return;
    }
    
    const org = user.organizationId;
    console.log('Fixing for organization:', org);

    const docs = await prisma.stockDocument.findMany({ 
        where: { type: 'receipt', status: 'confirmed', organizationId: org } 
    });
    
    let fixedCount = 0;
    
    for (const doc of docs) {
        if (!doc.items || !Array.isArray(doc.items as any[])) continue;
        for (const item of (doc.items as any[])) {
            if (!item.batchBarcode) continue;
            
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
                fixedCount++;
            }
        }
    }
    
    console.log(`Done! Fixed ${fixedCount} batches.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
