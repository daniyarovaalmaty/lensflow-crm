import prisma from './src/lib/db/prisma';
async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;
    const prods = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'VOLK' } }
    });
    for (const p of prods) {
        if (p.currentStock > 0) {
            console.log(`${p.name} - purchase: ${p.purchasePrice}, retail: ${p.retailPrice}`);
        }
    }
}
main();
