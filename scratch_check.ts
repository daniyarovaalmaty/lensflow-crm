import prisma from './src/lib/db/prisma';

async function main() {
    try {
        const orgs = await prisma.organization.findMany({
            where: { name: { contains: 'vision', mode: 'insensitive' } }
        });
        console.log('Orgs:', orgs.map(o => ({ id: o.id, name: o.name })));
        
        const products = await prisma.opticProduct.findMany({
            where: { organizationId: orgs[0]?.id },
            select: { id: true, name: true, type: true, currentStock: true, trackSerials: true }
        });
        console.log('Balavision services:', products.filter(p => p.type === 'service'));
    } catch (e) {
        console.error(e);
    }
}

main().catch(console.error);
