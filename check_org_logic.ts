import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const orgId = 'cmowv0aio000204la3rf3ff0f'; // HQ
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, type: true, parentId: true } });
    
    let relatedOrgIds: string[] = orgId ? [orgId] : [];
    if (org?.type === 'headquarters') {
        const branches = await prisma.organization.findMany({ where: { parentId: orgId }, select: { id: true } });
        relatedOrgIds = [orgId, ...branches.map((b: any) => b.id)];
    } else if (org?.parentId) {
        const siblings = await prisma.organization.findMany({ where: { parentId: org.parentId }, select: { id: true } });
        relatedOrgIds = [org.parentId, ...siblings.map((b: any) => b.id)];
    }

    console.log(`Related Orgs: ${relatedOrgIds}`);

    const orders = await prisma.order.findMany({
        where: { organizationId: { in: relatedOrgIds } }
    });

    console.log(`Orders fetched with this where clause: ${orders.length}`);

    await prisma.$disconnect();
    await pool.end();
}
main();
