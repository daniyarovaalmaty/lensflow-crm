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
        where: { organizationId: 'cmppqdn94000004gs8rwc1upr' } // Astana
    });

    console.log(`Total Astana Orders in DB: ${orders.length}`);
    const deletedCount = orders.filter(o => (o as any).isDeleted || (o as any).deletedAt).length;
    console.log(`Deleted: ${deletedCount}`);

    await prisma.$disconnect();
    await pool.end();
}
main();
