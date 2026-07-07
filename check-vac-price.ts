import prisma from './src/lib/db/prisma';
async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;
    const p = await prisma.opticProduct.findFirst({
        where: { organizationId: orgId, name: { contains: 'VAC ' } }
    });
    console.log(`VAC price:`, p?.retailPrice, p?.purchasePrice);
}
main();
