const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log('Orgs:', orgs);
  
  const docs = await prisma.user.findMany({ 
    where: { role: 'doctor' }, 
    select: { id: true, fullName: true, organization: { select: { name: true } } } 
  });
  console.log('Docs:', docs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
