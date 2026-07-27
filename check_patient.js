const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.findFirst({
    where: {
      id: { startsWith: 'cm' }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log("Latest Patient metadata:", JSON.stringify(patient.metadata, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
