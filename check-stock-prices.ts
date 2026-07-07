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

    let mismatch = 0;
    for (const s of stockItems) {
        const p = products.find(prod => prod.id === s.productId);
        if (p && s.purchasePrice !== p.purchasePrice) {
            console.log(`Stock item mismatch: product ${p.name} has ${p.purchasePrice}, but stock item has ${s.purchasePrice}`);
            mismatch++;
        }
    }
    console.log(`Total stock items with wrong purchasePrice: ${mismatch}`);
}
main();
