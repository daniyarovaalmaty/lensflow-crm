import prisma from './src/lib/db/prisma';

async function main() {
  console.log("Deleting 0071...");
  const saleToDelete = await prisma.sale.findUnique({
    where: { saleNumber: 'S-ORG--0071' },
    include: { items: true }
  });

  if (saleToDelete) {
    if (saleToDelete.items.length > 0) {
      await prisma.saleItem.deleteMany({
        where: { id: { in: saleToDelete.items.map(i => i.id) } }
      });
    }
    await prisma.sale.delete({ where: { id: saleToDelete.id } });
    console.log(`Deleted ${saleToDelete.saleNumber}`);
  } else {
    console.log("Not found.");
  }
}

main().catch(console.error).finally(() => process.exit(0));
