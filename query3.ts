import prisma from './src/lib/db/prisma';
async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [ { fullName: { contains: 'EYE' } }, { email: { contains: 'eyemax' } } ] }
  });
  console.log(users.map(u => ({ id: u.id, email: u.email, fullName: u.fullName, subRole: u.subRole })));
}
main().finally(() => prisma.$disconnect());
