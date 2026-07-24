import prisma from './src/lib/db/prisma';

async function main() {
  const accountants = await prisma.user.findMany({
    where: { subRole: 'lab_accountant' },
    select: { email: true, role: true, subRole: true, fullName: true }
  });
  console.log(accountants);
}

main().catch(console.error).finally(() => prisma.$disconnect());
