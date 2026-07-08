const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const appts = await prisma.appointment.findMany({
    where: { patientName: { contains: 'сериккызы лейлим', mode: 'insensitive' } },
    include: { createdBy: true }
  });
  console.log("Found appointments:", JSON.stringify(appts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
