import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    // Simulate session for optika.narodnaya.astana@gmail.com
    const user = await prisma.user.findUnique({ where: { email: 'optika.narodnaya.astana@gmail.com' } });
    if (!user) throw new Error('User not found');

    const session = { user };

    // From route.ts:
    const where: any = {};
    if (session.user.role !== 'doctor') {
        where.status = { not: 'draft' };
    }

    if (session.user.role === 'optic') {
        if (session.user.subRole === 'optic_procurement' || session.user.subRole === 'optic_manager') {
            const orgId = session.user.organizationId;
            const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, type: true, parentId: true } }) : null;
            let relatedOrgIds: string[] = orgId ? [orgId] : [];
            if (org?.type === 'headquarters') {
                const branches = await prisma.organization.findMany({ where: { parentId: orgId }, select: { id: true } });
                relatedOrgIds = [orgId, ...branches.map((b: any) => b.id)];
            } else if (org?.parentId) {
                const siblings = await prisma.organization.findMany({ where: { parentId: org.parentId }, select: { id: true } });
                relatedOrgIds = [org.parentId, ...siblings.map((b: any) => b.id)];
            }
            where.organizationId = { in: relatedOrgIds };
        } else {
            where.organizationId = session.user.organizationId;
        }
    } else if (session.user.role === 'doctor') {
        where.createdById = session.user.id;
    }

    console.log('Constructed where:', JSON.stringify(where, null, 2));

    const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });

    console.log(`Returned orders: ${orders.length}`);

    await prisma.$disconnect();
    await pool.end();
}
main();
