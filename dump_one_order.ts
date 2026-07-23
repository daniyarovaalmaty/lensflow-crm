import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const order1 = await prisma.order.findFirst({
        where: { orderNumber: 'AG78' } // missing
    });
    console.log('Missing order AG78:', JSON.stringify(order1, null, 2));

    const order2 = await prisma.order.findFirst({
        where: { orderNumber: 'AB46' } // visible
    });
    console.log('Visible order AB46:', JSON.stringify(order2, null, 2));

    await prisma.$disconnect();
    await pool.end();
}
main();
