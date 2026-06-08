const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const lenses = await prisma.product.findMany({
        where: { category: 'lens' },
        select: { id: true, name: true, description: true }
    });
    console.log(lenses);

    await prisma.$disconnect();
    await pool.end();
}

main().catch(console.error);
