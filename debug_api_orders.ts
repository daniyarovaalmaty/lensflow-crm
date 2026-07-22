import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const orgId = 'cmppqdn94000004gs8rwc1upr'; // Astana

    const orders = await prisma.order.findMany({
        where: { organizationId: orgId },
        include: {
            patient: true,
            createdBy: true,
            organization: true,
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`Astana orders fetched: ${orders.length}`);

    await prisma.$disconnect();
    await pool.end();
}
main();
