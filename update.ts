import prisma from './src/lib/db/prisma';
async function main() {
  await prisma.user.update({
    where: { id: 'cmruatzpu000104icg5odlm16' },
    data: { subRole: 'optic_manager' }
  });
  console.log('Updated subRole back to optic_manager for eyemax@lensflow.kz');
}
main().finally(() => prisma.$disconnect());
