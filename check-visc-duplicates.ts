import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const prods = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'VISC' } }
    });
    console.log("VISC duplicates:", prods.map(p => ({ id: p.id, name: p.name, price: p.retailPrice, stock: p.currentStock })));
    
    const cell = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'CELL 2%' } }
    });
    console.log("CELL duplicates:", cell.map(p => ({ id: p.id, name: p.name, price: p.retailPrice, stock: p.currentStock })));
}
main();
