import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const t2 = await prisma.opticProduct.findFirst({
        where: { organizationId: orgId, name: { contains: 'AJL RING' } }
    });
    const hoya = await prisma.opticProduct.findFirst({
        where: { organizationId: orgId, name: { contains: 'XY1AT2-SP' } }
    });
    console.log("AJL RING stock:", t2?.currentStock);
    console.log("HOYA XY1AT2-SP stock:", hoya?.currentStock);
}
main();
