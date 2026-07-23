import { prisma } from './src/lib/db/prisma';

async function main() {
    const docs = await prisma.stockDocument.findMany({ 
        where: { type: 'receipt', status: 'confirmed' } 
    });
    
    let mismatchCount = 0;
    
    for (const doc of docs) {
        if (!doc.items || !Array.isArray(doc.items as any[])) continue;
        for (const item of (doc.items as any[])) {
            if (!item.batchBarcode) continue;
            
            const batch = await prisma.stockItem.findFirst({
                where: { organizationId: doc.organizationId, serialNumber: item.batchBarcode }
            });
            
            if (batch && batch.productId !== item.productId) {
                console.log(`Mismatch found in org ${doc.organizationId} for barcode ${item.batchBarcode}`);
                mismatchCount++;
            }
        }
    }
    
    console.log(`Total remaining mismatches across ALL organizations: ${mismatchCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
