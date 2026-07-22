import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    console.log("=== TOTAL ORDERS BY BRANCH ===");
    const counts = await prisma.order.groupBy({
        by: ['organizationId'],
        _count: true,
    });
    
    for (const c of counts) {
        let orgName = "No Organization";
        if (c.organizationId) {
            const org = await prisma.organization.findUnique({ where: { id: c.organizationId }});
            if (org) orgName = org.name;
        }
        console.log(`Branch: ${orgName} - Orders: ${c._count}`);
    }
    
    console.log("\n=== ONLY ITIGRIS ORDERS BY BRANCH ===");
    const itigrisCounts = await prisma.order.groupBy({
        by: ['organizationId'],
        where: { source: 'itigris' },
        _count: true,
    });
    
    for (const c of itigrisCounts) {
        let orgName = "No Organization";
        if (c.organizationId) {
            const org = await prisma.organization.findUnique({ where: { id: c.organizationId }});
            if (org) orgName = org.name;
        }
        console.log(`Branch: ${orgName} - Itigris Orders: ${c._count}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
