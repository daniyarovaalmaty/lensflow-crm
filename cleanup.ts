import { prisma } from './src/lib/db/prisma';

async function main() {
  console.log('Starting cleanup...');

  // 1. Delete documents using raw SQL to bypass Tenant Isolation middleware
  const docNumbers = ['test2', 'test', 'E2026-00319'];
  console.log('Deleting stock documents...');
  for (const docNo of docNumbers) {
    await prisma.$executeRawUnsafe(`DELETE FROM stock_documents WHERE "documentNumber" = $1`, docNo);
    console.log(`Deleted document: ${docNo}`);
  }

  // 2. Delete products using raw SQL
  const productNames = ['AJL Cell 2%', 'AJL Visc 3%', 'test'];
  console.log('Finding products...');
  
  const products: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, name FROM optic_products WHERE name IN ($1, $2, $3)`,
    productNames[0], productNames[1], productNames[2]
  );

  const productIds = products.map(p => p.id);
  console.log(`Found ${productIds.length} products to delete:`, products.map(p => p.name));

  if (productIds.length > 0) {
    // We will delete them one by one to avoid passing array to $executeRawUnsafe which can be tricky
    for (const pid of productIds) {
      await prisma.$executeRawUnsafe(`DELETE FROM stock_items WHERE "productId" = $1`, pid);
      await prisma.$executeRawUnsafe(`DELETE FROM stock_movements WHERE "productId" = $1`, pid);
      await prisma.$executeRawUnsafe(`DELETE FROM optic_products WHERE id = $1`, pid);
      console.log(`Deleted product and its relations for id: ${pid}`);
    }
  }

  console.log('Cleanup finished.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
