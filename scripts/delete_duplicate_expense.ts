import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TARGET_ID = 'cms1ewosu000304js4vm41961';

async function main() {
  // Verify before delete
  const tx = await prisma.cashTransaction.findUnique({
    where: { id: TARGET_ID },
    include: {
      createdBy: { select: { fullName: true } },
      cashRegister: { select: { name: true } },
    }
  });

  if (!tx) {
    console.log('Transaction not found!');
    return;
  }

  console.log('=== DELETING THIS TRANSACTION ===');
  console.log(`  ID: ${tx.id}`);
  console.log(`  Type: ${tx.transType}, Amount: ${tx.amount}`);
  console.log(`  Description: ${tx.description}`);
  console.log(`  Created: ${tx.createdAt.toISOString()}`);
  console.log(`  Created by: ${tx.createdBy.fullName}`);
  console.log(`  Register: ${tx.cashRegister.name}`);

  await prisma.cashTransaction.delete({ where: { id: TARGET_ID } });
  console.log('\n✅ DELETED SUCCESSFULLY');

  // Verify deletion
  const check = await prisma.cashTransaction.findUnique({ where: { id: TARGET_ID } });
  console.log(`Verification: ${check ? 'STILL EXISTS!' : 'Confirmed deleted'}`);
}

main().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
