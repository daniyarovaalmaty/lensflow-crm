import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const orders = await prisma.order.findMany({
        where: { organizationId: 'cmppqdn94000004gs8rwc1upr' },
        select: { orderNumber: true, createdAt: true, updatedAt: true, createdBy: { select: { email: true } } },
        orderBy: { updatedAt: 'desc' }
    });

    console.log('Astana orders updated at:');
    for (const o of orders) {
        console.log(`- ${o.orderNumber}: created=${o.createdAt.toISOString()}, updated=${o.updatedAt.toISOString()}, user=${o.createdBy?.email}`);
    }

    await prisma.$disconnect();
    await pool.end();
}
main();
