const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  let createdSaleId;
  try {
    console.log('Finding an organization...');
    const user = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!user) throw new Error('No user found');
    const orgId = user.organizationId;
    
    console.log('Creating a dummy unpaid draft sale...');
    const sale = await prisma.sale.create({
      data: {
        saleNumber: `TEST-DRAFT-${Date.now()}`,
        organizationId: orgId,
        paymentStatus: 'unpaid',
        paymentMethod: 'cash',
        total: 100,
        subtotal: 100,
        items: {
          create: [{
             productId: (await prisma.opticProduct.findFirst()).id,
             name: 'Test Item',
             quantity: 1,
             unitPrice: 100,
             total: 100
          }]
        }
      }
    });
    createdSaleId = sale.id;
    console.log('Created sale with ID:', createdSaleId);
    
    console.log('Attempting to delete the draft exactly as the API does...');
    await prisma.saleItem.deleteMany({ where: { saleId: createdSaleId } });
    await prisma.sale.delete({ where: { id: createdSaleId } });
    
    console.log('SUCCESS: Draft deleted perfectly without any errors!');
    
  } catch (error) {
    console.error('ERROR OCCURRED DURING DELETE:', error);
  } finally {
    await prisma.$disconnect();
  }
}
run();
