import prisma from './src/lib/db/prisma';

async function main() {
  const org1 = await prisma.organization.findFirst({ where: { name: 'New Eye' } });
  const org2 = await prisma.organization.findFirst({ where: { name: { contains: 'Офтальмологический центр' } } });

  console.log("Main Org:", org1?.name);
  console.log("Secondary Org:", org2?.name);

  if (org1 && org2 && org1.id !== org2.id) {
    const usersInOrg2 = await prisma.user.findMany({ where: { organizationId: org2.id } });
    
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
main().catch(console.error).finally(() => process.exit(0));
