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
  const orgs = await prisma.organization.findMany({
    where: { name: { contains: 'eye', mode: 'insensitive' } },
    select: { id: true, name: true }
  });
  console.log('Orgs matching "eye":', orgs);

  if (orgs.length === 0) {
    const allOrgs = await prisma.organization.findMany({ select: { id: true, name: true } });
    console.log('All orgs:', allOrgs.map(o => `${o.name} (${o.id})`));
    return;
  }

  for (const org of orgs) {
    console.log(`\n=== ${org.name} (${org.id}) ===`);
    
    const txs = await prisma.cashTransaction.findMany({
      where: {
        amount: 13000,
        cashRegister: { organizationId: org.id },
        createdAt: {
          gte: new Date('2026-07-26T06:00:00Z'),
          lte: new Date('2026-07-26T07:00:00Z')
        }
      },
      include: {
        createdBy: { select: { fullName: true } },
        cashRegister: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${txs.length} transactions of 13000:`);
    for (const tx of txs) {
      console.log(`  ID: ${tx.id}`);
      console.log(`  Type: ${tx.transType}, Category: ${tx.category}`);
      console.log(`  Amount: ${tx.amount}, Method: ${tx.paymentMethod}`);
      console.log(`  Description: ${tx.description}`);
      console.log(`  Created: ${tx.createdAt.toISOString()}`);
      console.log(`  Created by: ${tx.createdBy.fullName}`);
      console.log(`  Register: ${tx.cashRegister.name}`);
      console.log('  ---');
    }
  }
}

main().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
