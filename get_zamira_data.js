const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { fullName: { contains: 'Замира' } }
  });
  console.log('Zamira:', users);
  
  if (users.length > 0) {
    const id = users[0].id;
    const medmundus = await prisma.medMundusConfig.findFirst({ where: { organizationId: users[0].organizationId }});
    console.log('Org:', users[0].organizationId, 'MedMundus:', !!medmundus);
    
    const appts = await prisma.appointment.findMany({
      where: { doctorId: id },
      take: 10,
      orderBy: { date: 'desc' }
    });
    console.log('Appointments:', appts.map(a => ({ type: a.type, date: a.date, status: a.status })));
    
    // Check sales
    const sales = await prisma.sale.findMany({
      where: { performedById: id },
      include: { items: true },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    console.log('Sales items:', sales.map(s => s.items.map(i => i.name)));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
