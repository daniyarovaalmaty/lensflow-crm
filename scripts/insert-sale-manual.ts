import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const doctor = await prisma.user.findFirst({
    where: { fullName: { contains: 'Шораева Айгерим', mode: 'insensitive' } }
  });
  
  const cashier = await prisma.user.findFirst({
    where: { fullName: { contains: 'Татьяна', mode: 'insensitive' } }
  });

  const patient = await prisma.patient.findFirst({
    where: { name: { contains: 'Жангабылов Берик', mode: 'insensitive' } }
  });

  const product = await prisma.opticProduct.findFirst({
    where: { name: { contains: 'Консультация', mode: 'insensitive' } }
  });

  console.log('Doctor:', doctor?.id, doctor?.fullName);
  console.log('Cashier:', cashier?.id, cashier?.fullName);
  console.log('Patient:', patient?.id, patient?.name);
  console.log('Product:', product?.id, product?.name);

  if (!doctor || !cashier || !product) {
    console.error('Missing required entities');
    return;
  }

  const newSale = await prisma.sale.create({
    data: {
      saleNumber: `MANUAL-${Date.now()}`,
      organizationId: doctor.organizationId || cashier.organizationId || '',
      customerName: 'Жангабылов Берик',
      subtotal: 5000,
      total: 5000,
      paidAmount: 5000,
      paymentMethod: 'kaspi',
      paymentStatus: 'paid',
      invoiceGenerated: false,
      doctorId: doctor.id,
      performedById: cashier.id,
      performedByName: cashier.fullName,
      patientId: patient?.id || null,
      createdAt: new Date('2026-07-11T12:00:00Z'),
      updatedAt: new Date('2026-07-11T12:00:00Z'),
      items: {
        create: [
          {
            productId: product.id,
            name: 'Консультация',
            category: product.category,
            quantity: 1,
            unitPrice: 5000,
            total: 5000
          }
        ]
      }
    }
  });

  console.log('Created sale:', newSale.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
