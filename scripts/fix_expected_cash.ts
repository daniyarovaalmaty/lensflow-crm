import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.cashShift.update({
    where: { id: 'cms1evo1z000004jst03w2e6i' },
    data: { expectedCash: 1280750 }
  });

  const shift = await prisma.cashShift.findUnique({
    where: { id: 'cms1evo1z000004jst03w2e6i' },
    select: { expectedCash: true }
  });
  console.log(`✅ expectedCash set to: ${shift?.expectedCash}`);
}

main().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
