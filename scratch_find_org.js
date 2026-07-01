const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: { name: { contains: 'New Eye', mode: 'insensitive' } }
  });
  console.log("Found New Eye orgs:", orgs.map(o => ({ id: o.id, name: o.name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
