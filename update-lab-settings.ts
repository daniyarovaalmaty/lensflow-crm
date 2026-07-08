import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.labSettings.upsert({
    where: { id: 'default' },
    update: {
      normContrapolPerLens: 0.05,
      normWaxPerLens: 0.05,
      normStickerPerLens: 1,
    },
    create: {
      id: 'default',
      normContrapolPerLens: 0.05,
      normWaxPerLens: 0.05,
      normStickerPerLens: 1,
    }
  });
  console.log('Lab settings updated successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
