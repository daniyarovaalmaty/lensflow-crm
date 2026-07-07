import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const p1 = await prisma.opticProduct.findFirst({
        where: { organizationId: orgId, name: { contains: 'V40LC' } }
    });
    console.log("V40LC:", p1?.name);

    const p2 = await prisma.opticProduct.findFirst({
        where: { organizationId: orgId, name: { contains: 'VDGTLHM-BK' } }
    });
    console.log("VDGTLHM-BK:", p2?.name);
}
main();
