const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const appts = await prisma.appointment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { createdBy: true }
  });
  console.log("Recent appointments:");
  appts.forEach(a => console.log(`- ${a.patientName} (createdById: ${a.createdById})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
