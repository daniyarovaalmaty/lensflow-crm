import prisma from './src/lib/db/prisma';
async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;
    const v = await prisma.opticProduct.findFirst({
        where: { organizationId: orgId, name: { contains: 'V78С-SR' } }
    });
    console.log("V78C-SR stock:", v?.currentStock);
}
main();
