const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Айгерим' } },
        { fullName: { contains: 'Шораева' } },
        { organization: { name: { contains: 'New Eye' } } }
      ]
    },
    include: {
      organization: true
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
