import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { fullName: true, role: true, subRole: true } });
  console.log(users);
}
main();
