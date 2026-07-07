import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const zeroPriceWithStock = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, retailPrice: 0, currentStock: { gt: 0 } },
        select: { id: true, name: true, retailPrice: true, currentStock: true }
    });
    
    console.log(`Found ${zeroPriceWithStock.length} products with stock > 0 but retailPrice == 0:`);
    for (const p of zeroPriceWithStock) {
        console.log(`- ${p.name} (Stock: ${p.currentStock})`);
    }
}
main();
