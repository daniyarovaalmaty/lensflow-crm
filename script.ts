import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Айгерим' } },
        { fullName: { contains: 'Шораева' } }
      ]
    },
    include: { organization: true }
  });
  console.log(JSON.stringify(users, null, 2));
}
main();
