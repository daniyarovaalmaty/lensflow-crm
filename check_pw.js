const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'accountant@medinvision.kz' }
  });
  console.log(user ? { id: user.id, email: user.email, hasPassword: !!user.password, status: user.status } : 'User not found');
}
main().catch(console.error).finally(() => prisma.$disconnect());
