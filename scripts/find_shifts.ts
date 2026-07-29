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
  // Find closed shifts for New Eye on July 21-22
  const shifts = await prisma.cashShift.findMany({
    where: {
      cashRegister: { organizationId: 'org-demo-neweye' },
      status: 'closed',
      openedAt: {
        gte: new Date('2026-07-21T00:00:00+05:00'),
        lte: new Date('2026-07-23T00:00:00+05:00')
      }
    },
    include: {
      cashRegister: { select: { name: true } },
      openedBy: { select: { fullName: true } },
    },
    orderBy: { openedAt: 'asc' }
  });

  console.log(`Found ${shifts.length} closed shifts:`);
  for (const s of shifts) {
    console.log(`\n  ID: ${s.id}`);
    console.log(`  Opened: ${s.openedAt.toISOString()}`);
    console.log(`  Closed: ${s.closedAt?.toISOString()}`);
    console.log(`  Register: ${s.cashRegister.name}`);
    console.log(`  startingCash: ${s.startingCash}`);
    console.log(`  expectedCash: ${s.expectedCash}`);
    console.log(`  actualCash: ${s.actualCash}`);
    console.log(`  discrepancy: ${s.discrepancy}`);
  }
}

main().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
