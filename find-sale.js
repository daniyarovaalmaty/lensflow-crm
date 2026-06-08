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
          customerName: { contains: 'Алия Байжуманова', mode: 'insensitive' }
      },
      include: { items: true }
  });
  
  if (sales.length === 0) {
      // maybe search by phone
      const salesByPhone = await prisma.sale.findMany({
          where: { customerPhone: { contains: '77001033005' } },
          include: { items: true }
      });
      console.log('Found by phone:', JSON.stringify(salesByPhone, null, 2));
  } else {
      console.log('Found by name:', JSON.stringify(sales, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
