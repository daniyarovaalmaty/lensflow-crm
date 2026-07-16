import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixBalances() {
  const user = await prisma.user.findUnique({
    where: { email: 'medinnovation.kaz2021@gmail.com' }
  });
  
  if (user) {
    const orgId = user.organizationId;
    console.log('Org ID:', orgId);
    
    // Get all optic products for this org
    const products = await prisma.opticProduct.findMany({
      where: { organizationId: orgId },
      include: { stockItems: true }
    });
    
    for (const p of products) {
      const realStock = p.stockItems.reduce((acc, item) => acc + item.quantity, 0);
      if (p.currentStock !== realStock) {
        await prisma.opticProduct.update({
          where: { id: p.id },
          data: { currentStock: realStock }
        });
        console.log(`Updated product ${p.name}: ${p.currentStock} -> ${realStock}`);
      }
    }
    console.log('Done fixing balances.');
  }
}
fixBalances().finally(() => {
    prisma.$disconnect();
    pool.end();
});
