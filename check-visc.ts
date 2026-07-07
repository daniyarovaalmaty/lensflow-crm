import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const prods = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'VISC 2%' } }
    });
    for (const p of prods) {
        console.log(`ID: ${p.id} | Name: ${p.name} | Price: ${p.retailPrice} | Stock: ${p.currentStock}`);
    }
}
main();
