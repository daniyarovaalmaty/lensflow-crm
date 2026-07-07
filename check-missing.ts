import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const nanex = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'NANEX' } }
    });
    console.log("Nanex DB products:", nanex.map(p => p.name));
    
    const vivinex = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'VIVINEX' } }
    });
    console.log("Vivinex DB products:", vivinex.map(p => p.name));
}
main();
