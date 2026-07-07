import prisma from './src/lib/db/prisma';

async function run() {
  const medInnovation = await prisma.user.findUnique({
      where: { email: 'medinnovation.kaz2021@gmail.com' }
  });
  const orgId = medInnovation?.organizationId;
  if (!orgId) return;
  const prods = await prisma.opticProduct.findMany({ where: { organizationId: orgId, name: { contains: 'VOLK' } } });
  console.log('VOLK products:', prods.length);
}
run();
