require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});
async function main() {
  const patients = await prisma.patient.findMany({
    where: { name: { contains: 'Шимаров', mode: 'insensitive' } },
    select: { id: true, name: true, phone: true, createdAt: true }
  });
  console.log(JSON.stringify(patients, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
