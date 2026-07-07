import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const products = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'iSert 151' } }
    });
    for (const p of products) {
        console.log(`DB Stock for ${p.name}: ${p.currentStock}`);
    }
}
main();
