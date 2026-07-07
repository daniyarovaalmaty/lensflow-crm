import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const nanex = await prisma.opticProduct.findFirst({ where: { organizationId: orgId, name: { contains: 'NY1-SP' } }});
    const xy1 = await prisma.opticProduct.findFirst({ where: { organizationId: orgId, name: { contains: 'XY1-SP' }, NOT: { name: { contains: 'TORIC' } } }});
    const xc1 = await prisma.opticProduct.findFirst({ where: { organizationId: orgId, name: { contains: 'XC1-SP' } }});

    console.log("Nanex DB stock before:", nanex?.currentStock);
    
    // We already inserted 5619 items. 
    // It's safe to just run import-final.ts again with these mappings added!
}
main();
