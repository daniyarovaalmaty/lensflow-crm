import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const prods = await prisma.opticProduct.findMany({
        where: { organizationId: orgId }
    });

    const iserts = prods.filter(p => p.name.includes('251'));
    console.log('251:', iserts.map(p => p.name));

    const nanex = prods.filter(p => p.name.includes('NY1-SP'));
    console.log('NY1-SP:', nanex.map(p => p.name));

    const viv = prods.filter(p => p.name.includes('XY1-SP'));
    console.log('XY1-SP:', viv.map(p => p.name));

    const xc1 = prods.filter(p => p.name.includes('XC1-SP'));
    console.log('XC1-SP:', xc1.map(p => p.name));

    const t2 = prods.filter(p => p.name.includes('XY1AT2-SP'));
    console.log('XY1AT2-SP:', t2.map(p => p.name));
}
main();
