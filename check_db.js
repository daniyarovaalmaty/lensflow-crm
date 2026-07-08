const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

async function main() {
  const appt = await prisma.appointment.findFirst({
    where: { patientName: { contains: 'сериккызы лейлим' } },
    include: { createdBy: true }
  });
  console.log("Found appointment:", JSON.stringify(appt, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
