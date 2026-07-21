import prisma from './src/lib/db/prisma';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@lensflow.kz' } });
  console.log(user);
}
main().catch(console.error).finally(() => process.exit(0));
