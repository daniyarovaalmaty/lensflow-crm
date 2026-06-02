import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Replicate the exact query the lab would run
  const where: any = {};
  where.OR = [
    { distributorOrgId: null },
    { labOrgId: 'org-lab-medinvision' },
  ];

  try {
    const orders = await prisma.order.findMany({
      where,
      include: { patient: true, organization: { select: { name: true } }, createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log('Query OK! Found', orders.length, 'orders');
    orders.forEach((o: any) => console.log(`  #${o.orderNumber} dist=${o.distributorOrgId} lab=${o.labOrgId} status=${o.status}`));
  } catch (e: any) {
    console.error('QUERY ERROR:', e.message);
  }

  await prisma.$disconnect();
  await pool.end();
}
main();
