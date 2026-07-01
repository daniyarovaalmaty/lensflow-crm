const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    where: { fullName: { contains: 'Валерия' } }
  });
  console.log('Valeria:', users);

  if (users.length > 0) {
    const vId = users[0].id;
    // Check sales created by her
    const sales = await prisma.sale.findMany({
      where: { createdById: vId },
      include: { items: true }
    });
    console.log('Sales created by Valeria:', sales.length);
    
    // Count sales with "подбор"
    let podborCount = 0;
    sales.forEach(s => {
      if (s.items && Array.isArray(s.items)) {
         if (s.items.some(i => i.name && i.name.toLowerCase().includes('подбор'))) {
            podborCount++;
         }
      }
    });
    console.log('Sales with "подбор" created by her:', podborCount);

    // Check appointments where she is the doctor
    const appts = await prisma.appointment.findMany({
      where: { doctorId: vId }
    });
    console.log('Appointments assigned to her:', appts.length);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
