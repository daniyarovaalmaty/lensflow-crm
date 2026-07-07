import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const prods = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'Silicone Oil' } }
    });
    console.log("Silicone Oil duplicates:", prods.map(p => ({ id: p.id, name: p.name, price: p.retailPrice, stock: p.currentStock })));
    
    const ribo = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'Ribocross' } }
    });
    console.log("Ribocross duplicates:", ribo.map(p => ({ id: p.id, name: p.name, price: p.retailPrice, stock: p.currentStock })));
}
main();
