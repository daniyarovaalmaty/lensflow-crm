import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const volkDbProducts = await prisma.opticProduct.findMany({
        where: { organizationId: orgId, name: { contains: 'VOLK' } },
        orderBy: { name: 'asc' }
    });
    for (const p of volkDbProducts) {
        if (p.currentStock > 0 || p.name.includes('V78C') || p.name.includes('V90C')) {
            console.log(`- ${p.name}: ${p.currentStock}`);
        }
    }
}
main();
