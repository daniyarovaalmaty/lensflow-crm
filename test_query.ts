import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const orgId = 'cmppq81j5000004l7wz91a2n4';
    
    let fetchOrgId: any = orgId;
    
    // Simulate targetOrgId === 'all'
    const myOrg = await prisma.organization.findUnique({ where: { id: orgId }, select: { type: true } });
    if (myOrg?.type === 'headquarters') {
        const childOrgs = await prisma.organization.findMany({ 
            where: { parentId: orgId }, 
            select: { id: true } 
        });
        fetchOrgId = { in: [orgId, ...childOrgs.map((o: any) => o.id)] };
    }
    
    console.log('fetchOrgId', fetchOrgId);
    
    const products = await prisma.opticProduct.findMany({ 
        where: { organizationId: fetchOrgId }, 
        take: 10 
    });
    
    console.log('got products', products.length);
}

main().finally(() => prisma.$disconnect());
