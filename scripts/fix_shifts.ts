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
  // Find shift for July 15
  const shift15 = await prisma.cashShift.findFirst({
    where: {
      cashRegister: { organizationId: 'org-demo-neweye' },
      status: 'closed',
      openedAt: {
        gte: new Date('2026-07-15T00:00:00+05:00'),
        lte: new Date('2026-07-16T00:00:00+05:00')
      }
    },
    select: { id: true, startingCash: true, expectedCash: true, actualCash: true }
  });
  console.log('15.07 shift:', shift15);

  // Update all three: set expectedCash = actualCash
  // 21.07
  await prisma.cashShift.update({
    where: { id: 'cmru6m1b8000204i6yox967bv' },
    data: { expectedCash: 1303100 }
  });
  console.log('✅ 21.07: expectedCash → 1303100 (= actualCash)');

  // 22.07
  await prisma.cashShift.update({
    where: { id: 'cmrvlyej5000004kvfn2agcs5' },
    data: { expectedCash: 1303100 }
  });
  console.log('✅ 22.07: expectedCash → 1303100 (= actualCash)');

  // 15.07
  if (shift15) {
    await prisma.cashShift.update({
      where: { id: shift15.id },
      data: { expectedCash: shift15.actualCash }
    });
    console.log(`✅ 15.07: expectedCash → ${shift15.actualCash} (= actualCash)`);
  }

  // Verify all three
  const s21 = await prisma.cashShift.findUnique({ where: { id: 'cmru6m1b8000204i6yox967bv' }, select: { expectedCash: true, actualCash: true } });
  const s22 = await prisma.cashShift.findUnique({ where: { id: 'cmrvlyej5000004kvfn2agcs5' }, select: { expectedCash: true, actualCash: true } });
  const s15 = shift15 ? await prisma.cashShift.findUnique({ where: { id: shift15.id }, select: { expectedCash: true, actualCash: true } }) : null;
  console.log('\nVerification (expected = actual = разница 0):');
  console.log('15.07:', s15);
  console.log('21.07:', s21);
  console.log('22.07:', s22);
}

main().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
