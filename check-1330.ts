import prisma from './src/lib/db/prisma';
async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;
    const prods = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, purchasePrice: 1330 }
    });
    console.log(`Products with purchasePrice 1330: ${prods.length}`);
    const prods2 = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, retailPrice: 1330 }
    });
    console.log(`Products with retailPrice 1330: ${prods2.length}`);
}
main();
