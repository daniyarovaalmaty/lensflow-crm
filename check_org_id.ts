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
        where: { createdBy: { email: 'zakazy.optika.narodnaya@gmail.com' } }
    });

    console.log(`Orders by zakazy: ${orders.length}`);
    const orgMap = new Map();
    for (const o of orders) {
        orgMap.set(o.organizationId, (orgMap.get(o.organizationId) || 0) + 1);
    }
    for (const [orgId, count] of orgMap.entries()) {
        console.log(`- Org: ${orgId}, Count: ${count}`);
    }

    await prisma.$disconnect();
    await pool.end();
}
main();
