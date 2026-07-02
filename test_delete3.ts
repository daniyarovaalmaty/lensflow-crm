export const dynamic = 'force-dynamic';
import prisma from './src/lib/db/prisma';

async function main() {
  const users = await prisma.user.findMany({ where: { organizationId: { not: null } } });
  for (const u of users) {
    const product = await prisma.opticProduct.findFirst({ where: { organizationId: u.organizationId } });
    if (product) {
      console.log('Creating draft sale...');
      const sale = await prisma.sale.create({
          data: {
              saleNumber: 'TEST-DRAFT-99',
              organizationId: u.organizationId,
              subtotal: product.retailPrice,
              total: product.retailPrice,
              paidAmount: 0,
              paymentStatus: 'unpaid',
              paymentMethod: 'cash',
              performedById: u.id,
              performedByName: u.fullName || u.email,
              items: {
                  create: [
                      {
                          productId: product.id,
                          name: product.name,
                          category: product.category,
                          quantity: 1,
                          unitPrice: product.retailPrice,
                          total: product.retailPrice,
                      }
                  ]
              }
          }
      });
      
      console.log('Created draft sale:', sale.id);
      
      try {
          await prisma.sale.delete({ where: { id: sale.id } });
          console.log('Deleted sale ONLY successfully!');
      } catch (e: any) {
          console.error('Delete sale failed:', e.message);
      }
      return;
    }
  }
}

main().finally(() => {});
