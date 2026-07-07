import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const allProducts = await prisma.opticProduct.findMany({ where: { organizationId: orgId } });
    
    // Check all names
    for (let p of allProducts) {
        if (p.name.toUpperCase().includes('RIBOFAST') || p.name.toUpperCase().includes('OCULFIT') || p.name.toUpperCase().includes('AFR') || p.name.toUpperCase().includes('CW') || p.name.toUpperCase().includes('CCW')) {
            console.log(p.id, p.name);
        }
    }
}
main();
