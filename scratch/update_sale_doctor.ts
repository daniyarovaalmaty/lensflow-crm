import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import prisma from '../src/lib/db/prisma';

async function run() {
  const sale = await prisma.sale.findFirst({
    where: { saleNumber: 'S-ORG--0171' }
  });
  console.log('Found sale:', sale);

  if (!sale) return;

  const doctor = await prisma.user.findFirst({
    where: { 
      fullName: { contains: 'Сапарова' }
    }
  });
  console.log('Found doctor:', doctor);

  if (doctor) {
    await prisma.sale.update({
      where: { id: sale.id },
      data: { 
        doctorId: doctor.id,
        // Also update performedByName if it exists on Sale, let's just log first
      }
    });
    console.log('Sale updated!');
  } else {
    console.log('Doctor not found');
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
