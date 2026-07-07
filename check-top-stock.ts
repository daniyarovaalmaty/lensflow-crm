import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const prods = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, currentStock: { gt: 0 } },
        orderBy: { currentStock: 'desc' }
    });

    console.log(`Products with stock > 0: ${prods.length}`);
    console.log(`Total stock across all products: ${prods.reduce((sum, p) => sum + p.currentStock, 0)}`);

    console.log("\n--- TOP 30 PRODUCTS BY STOCK ---");
    for (let i = 0; i < Math.min(30, prods.length); i++) {
        console.log(`[${prods[i].currentStock}] ${prods[i].name}`);
    }
}
main();
