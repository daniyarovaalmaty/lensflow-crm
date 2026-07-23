import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const user = await prisma.user.findUnique({ where: { email: 'optika.narodnaya.astana@gmail.com' } });
    if (!user) throw new Error('User not found');
    const session = { user };

    const where: any = {};
    if (session.user.role !== 'doctor') where.status = { not: 'draft' };

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

    const orders = await prisma.order.findMany({
        where,
        include: {
            patient: true,
            createdBy: { select: { fullName: true } },
            organization: { select: { name: true, inn: true, deliveryAddress: true } },
            engineer: { select: { fullName: true } },
            labOrg: { select: { name: true, inn: true, deliveryAddress: true, bankName: true, bik: true, iban: true } },
            distributorOrg: { select: { name: true, inn: true, deliveryAddress: true, bankName: true, bik: true, iban: true } },
            contract: { include: { provider: true, client: true } },
        },
        orderBy: { createdAt: 'desc' }
    });

    const orgsWithMissingContracts = orders.filter((o: any) => !o.contract && o.organizationId).map((o: any) => o.organizationId);
    const uniqueOrgs = [...new Set(orgsWithMissingContracts)];
    const fallbackContracts = await prisma.contract.findMany({
        where: { clientId: { in: uniqueOrgs as string[] }, status: 'active' },
        include: { provider: true, client: true },
        orderBy: { date: 'desc' }
    });
    const contractMap = new Map();
    fallbackContracts.forEach(c => {
        if (!contractMap.has(c.clientId)) contractMap.set(c.clientId, c);
    });

    try {
        const transformed = orders.map((order: any) => {
            const fallbackContract = order.organizationId ? contractMap.get(order.organizationId) : undefined;
            return {
                id: order.id,
                order_id: order.orderNumber,
                meta: { optic_id: order.organizationId || '' },
                contract: order.contract || fallbackContract || null
            };
        });
        console.log(`Transformed OK. Length: ${transformed.length}`);
    } catch (e: any) {
        console.error('Error in map:', e.message);
    }

    await prisma.$disconnect();
    await pool.end();
}
main();
