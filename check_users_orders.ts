import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const astanaOrders = await prisma.order.findMany({
        where: { organization: { name: 'Оптика Народная Астана' } },
        include: { createdBy: true }
    });

    const userMap = new Map();
    for (const o of astanaOrders) {
        const u = o.createdBy?.email || 'Unknown';
        userMap.set(u, (userMap.get(u) || 0) + 1);
    }
    console.log('Astana orders by user:');
    for (const [email, count] of userMap.entries()) {
        console.log(`- ${email}: ${count} orders`);
    }

    await prisma.$disconnect();
    await pool.end();
}
main();
