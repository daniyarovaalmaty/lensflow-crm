const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const sales = await prisma.sale.findMany({
      where: { 
          OR: [
              { total: 10000 },
              { subtotal: 10000 }
          ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { items: true }
  });
  console.log('Found sales with 10000:', JSON.stringify(sales, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
