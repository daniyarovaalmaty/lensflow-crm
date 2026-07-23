import prisma from './src/lib/db/prisma';
async function run() {
  const user = await prisma.user.findUnique({
    where: { email: 'optika.narodnaya.astana@gmail.com' },
    include: { organization: true }
  });
  console.log(JSON.stringify(user, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
