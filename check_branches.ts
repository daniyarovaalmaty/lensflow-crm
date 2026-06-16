import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const orgId = 'cmowv0aio000204la3rf3ff0f';
    const branches = await prisma.organization.findMany({ where: { parentId: orgId } });
    console.log('Branches:', branches.map(b => ({ id: b.id, name: b.name })));
    
    // Check orders for these branches
    for (const b of branches) {
        const branchOrders = await prisma.order.findMany({ where: { organizationId: b.id } });
        console.log(`Orders for ${b.name}:`, branchOrders.length);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
