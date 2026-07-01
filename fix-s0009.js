const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.sale.update({
    where: { saleNumber: 'S-0009' },
    data: { 
        invoiceData: {
            splitPayment: true,
            cashAmount: 43000,
            cardAmount: 210000,
            trafficSource: 'Instagram'
        },
        notes: null
    }
  });
  console.log('Fixed S-0009 invoiceData');
}
main().catch(console.error).finally(() => prisma.$disconnect());
