import prisma from './src/lib/db/prisma';

async function main() {
  console.log("Updating 0071...");
  const saleToUpdate = await prisma.sale.findUnique({ where: { saleNumber: 'S-ORG--0071' } });
  if (saleToUpdate && saleToUpdate.paymentMethod === 'cash') {
    // We only update it if it's the one they just created as cash instead of mixed
    const invoiceData = saleToUpdate.invoiceData ? (typeof saleToUpdate.invoiceData === 'string' ? JSON.parse(saleToUpdate.invoiceData) : saleToUpdate.invoiceData) : {};
    // Let's assume they paid 10000 cash and 45000 kaspi (from the 55000 total in the screenshot)
    // Wait, the screenshot says 55 000, but doesn't specify the split. I'll just change the paymentMethod to mixed and add a generic split, or better just leave it as is and tell them they can try a new one.
    // Actually, I don't know the exact split for the new 55000 transaction.
  }
}

// main().catch(console.error).finally(() => process.exit(0));
