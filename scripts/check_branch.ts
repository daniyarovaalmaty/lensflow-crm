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
  // Check what org cmppqe8gr000c04l7n2mih9tq is
  const org1 = await prisma.organization.findUnique({
    where: { id: 'cmppqe8gr000c04l7n2mih9tq' },
    select: { id: true, name: true }
  });
  console.log('Branch in localStorage:', org1);

  // Check Elena's org
  const elena = await prisma.user.findFirst({
    where: { fullName: { contains: 'Елена', mode: 'insensitive' }, organizationId: 'org-demo-neweye' },
    select: { id: true, fullName: true, organizationId: true, email: true }
  });
  console.log('Elena:', elena);

  // Check New Eye org
  const neweye = await prisma.organization.findUnique({
    where: { id: 'org-demo-neweye' },
    select: { id: true, name: true }
  });
  console.log('New Eye org:', neweye);
}

main().catch(console.error).finally(() => { prisma.$disconnect(); pool.end(); });
