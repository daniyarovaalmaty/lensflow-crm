import { prisma } from './src/lib/db/prisma';

async function main() {
  const prescription = await prisma.prescription.findFirst({
    where: { externalSource: 'itigris' },
    include: { patient: true }
  });

  if (prescription && prescription.patient) {
    console.log('Найден пациент с выгруженным рецептом из Itigris:');
    console.log('Имя:', prescription.patient.name);
    console.log('Телефон:', prescription.patient.phone);
    console.log('Рецепт:');
    console.log(`OD: Sph ${prescription.odSph}, Cyl ${prescription.odCyl}`);
    console.log(`OS: Sph ${prescription.osSph}, Cyl ${prescription.osCyl}`);
  } else {
    console.log('Пока не найдено ни одного рецепта из Itigris.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
