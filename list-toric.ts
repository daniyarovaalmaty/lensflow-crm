import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const products = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'TORIC' } }
    });
    for (const p of products) {
        console.log(`- ${p.name}`);
    }
}
main();
