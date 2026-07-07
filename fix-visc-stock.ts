import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const wrongId = "cmr4pcx3k0067y26luelv543q";
    const correctId = "cmr4pcsxg0064y26lgb3ugecx";

    // Reassign all stock items
    const updated = await prisma.stockItem.updateMany({
        where: { productId: wrongId, organizationId: orgId },
        data: { productId: correctId, purchasePrice: 5452 } 
    });
    
    // Fix currentStock counts
    await prisma.opticProduct.update({
        where: { id: wrongId, organizationId: orgId },
        data: { currentStock: 0 }
    });
    
    await prisma.opticProduct.update({
        where: { id: correctId, organizationId: orgId },
        data: { currentStock: 924 }
    });
    
    console.log(`Moved ${updated.count} stock items to the correct product!`);
}
main();
