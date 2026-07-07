import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const queries = ['AJL Silicone', 'Glautex', 'Ribocross', 'V40', 'V78', 'AJL VIsc'];
    
    for (const q of queries) {
        console.log(`\nSearch results for '${q}':`);
        const products = await prisma.opticProduct.findMany({
            where: {
                organizationId: orgId,
                name: { contains: q, mode: 'insensitive' }
            },
            select: { id: true, name: true }
        });
        products.forEach(p => console.log(`  - ${p.name}`));
    }
}
main();
