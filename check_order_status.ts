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

    const statusMap = new Map();
    for (const o of orders) {
        statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
    }
    console.log('Orders by zakazy by status:');
    for (const [status, count] of statusMap.entries()) {
        console.log(`- ${status}: ${count}`);
    }

    await prisma.$disconnect();
    await pool.end();
}
main();
