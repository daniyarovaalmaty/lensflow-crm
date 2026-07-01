import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sale = await prisma.sale.findUnique({
    where: { saleNumber: 'S-0004' },
    include: { items: true }
  });

  if (!sale) {
    console.log('Sale S-0004 not found');
    return;
  }

  const fittingItem = sale.items.find(i => i.name.includes('Подбор'));
  if (fittingItem) {
    await prisma.saleItem.update({
      where: { id: fittingItem.id },
      data: {
        unitPrice: 300000,
        total: 150000,
        name: 'Подбор одной линзы (Скидка 50%)'
      }
    });
    
    // Also update the sale subtotal if needed. The total is already 168000.
    // If unitPrice of fitting becomes 300k, the new subtotal would be 318000.
    // Let's just update the subtotal. We won't set overall discount so it doesn't say "Итого (скидка X%)".
    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        subtotal: 318000
      }
    });

    console.log('Successfully updated S-0004');
  } else {
    console.log('Fitting item not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
