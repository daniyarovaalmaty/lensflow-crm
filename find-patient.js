const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const patient = await prisma.patient.findFirst({
      where: { phone: { contains: '77001033005' } },
      include: { sales: true }
  });
  console.log('Found patient:', JSON.stringify(patient, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
