import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const order = await prisma.order.findUnique({
        where: { orderNumber: 'AB46' },
        include: { createdBy: true }
    });

    console.log(`AB46 created by: ${order?.createdBy?.email} (role: ${order?.createdBy?.role}, subRole: ${order?.createdBy?.subRole})`);

    await prisma.$disconnect();
    await pool.end();
}
main();
