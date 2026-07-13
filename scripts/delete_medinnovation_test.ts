import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = (process.env.DATABASE_URL || process.env.DIRECT_URL || '').replace(/"/g, '');
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting deletion script...');
  
  // 1. Find the organization
  const user = await prisma.user.findUnique({
    where: { email: 'medinnovation.kaz2021@gmail.com' },
    include: { organization: true }
  });

  if (!user || !user.organizationId) {
    console.error('User or organization not found!');
    return;
  }

  const orgId = user.organizationId;
  console.log(`Found organization ID: ${orgId} for medinnovation`);

  // 2. Find the documents
  const docs = await prisma.stockDocument.findMany({
    where: {
      organizationId: orgId,
      documentNumber: { in: ['1', '2'] }
    }
  });
  console.log(`Found documents to delete:`, docs.map(d => d.documentNumber));

  const docIds = docs.map(d => d.id);

  // 3. Find the test product
  const products = await prisma.opticProduct.findMany({
    where: {
      organizationId: orgId,
      name: { contains: 'test ajl', mode: 'insensitive' }
    }
  });
  console.log(`Found products to delete:`, products.map(p => p.name));

  const productIds = products.map(p => p.id);

  // 4. Delete in transaction to handle foreign keys safely
  if (docIds.length > 0 || productIds.length > 0) {
    await prisma.$transaction(async (tx) => {
      // Delete StockMovements related to these docs or products
      const deletedLogs = await tx.stockMovement.deleteMany({
        where: {
          OR: [
            { documentId: { in: docIds } },
            { productId: { in: productIds } }
          ]
        }
      });
      console.log(`Deleted ${deletedLogs.count} movement logs.`);

      // Delete StockItems related to these products or from these docs
      const deletedStockItems = await tx.stockItem.deleteMany({
        where: {
          OR: [
            { receiptDocId: { in: docIds } },
            { productId: { in: productIds } }
          ]
        }
      });
      console.log(`Deleted ${deletedStockItems.count} stock items.`);

      // Delete DocumentItems (if any such model exists)
      // Since items are usually JSON in document.items, we just delete the documents
      
      // Delete Documents
      if (docIds.length > 0) {
        const deletedDocs = await tx.stockDocument.deleteMany({
          where: { id: { in: docIds } }
        });
        console.log(`Deleted ${deletedDocs.count} documents.`);
      }

      // Delete Products
      if (productIds.length > 0) {
        const deletedProducts = await tx.opticProduct.deleteMany({
          where: { id: { in: productIds } }
        });
        console.log(`Deleted ${deletedProducts.count} products.`);
      }
    });

    console.log('Successfully deleted test data!');
  } else {
    console.log('No test data found to delete.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
