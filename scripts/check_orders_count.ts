import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.order.count();
  console.log('Current DB Count:', count);
}
main().finally(() => prisma.$disconnect());
