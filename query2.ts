import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: { subRole: 'optic_accountant' }
  });
  console.log(users.map(u => ({ id: u.id, email: u.email, fullName: u.fullName, subRole: u.subRole })));
}
main().finally(() => prisma.$disconnect());
