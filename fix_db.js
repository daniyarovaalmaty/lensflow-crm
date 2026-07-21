const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org1 = await prisma.organization.findFirst({ where: { name: 'New Eye' } });
  const org2 = await prisma.organization.findFirst({ where: { name: { contains: 'Офтальмологический центр' } } });

  console.log("Main Org:", org1);
  console.log("Secondary Org:", org2);

  if (org1 && org2) {
    const usersInOrg2 = await prisma.user.findMany({ where: { organizationId: org2.id } });
    console.log("Users in secondary org:", usersInOrg2.map(u => u.fullName + " | " + u.phone));
    
    // Move them to org1 and make them managers
    for (const u of usersInOrg2) {
        await prisma.user.update({
            where: { id: u.id },
            data: { 
                organizationId: org1.id,
                role: 'optic',
                subRole: 'optic_manager'
            }
        });
        console.log(`Moved user ${u.fullName} to New Eye`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
