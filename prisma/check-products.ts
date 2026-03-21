import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
    const products = await prisma.product.findMany({
        where: { category: 'lens' }
    });
    console.log(JSON.stringify(products, null, 2));
}

main()
    .catch(console.error)
    .finally(async () => { await prisma.$disconnect(); await pool.end(); });
