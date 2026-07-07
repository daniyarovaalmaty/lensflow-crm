import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const stockItems = await prisma.stockItem.findMany({
        where: { organizationId: orgId }
    });
    
    const products = await prisma.opticProduct.findMany({
        where: { organizationId: orgId }
    });
    
    let totalPurchase = 0;
    let totalRetail = 0;
    
    for (const s of stockItems) {
        totalPurchase += (s.purchasePrice || 0);
        const p = products.find(prod => prod.id === s.productId);
        if (p) totalRetail += (p.retailPrice || 0);
    }
    
    console.log(`Total items: ${stockItems.length}`);
    console.log(`Total purchase value: ${totalPurchase.toLocaleString('ru-RU')} ₸`);
    console.log(`Total retail value: ${totalRetail.toLocaleString('ru-RU')} ₸`);
}
main();
