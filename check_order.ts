import { prisma } from './src/lib/db/prisma';

async function main() {
  const order = await prisma.order.findFirst({ where: { externalId: 'itigris:1000502164' } });
  console.log('ORDER DATA:', JSON.stringify(order, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
