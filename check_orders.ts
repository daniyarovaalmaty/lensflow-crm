import prisma from './src/lib/db/prisma';

async function main() {
  const org = await prisma.organization.findFirst({ where: { name: 'Оптика Народная' } });
  if (!org) {
    console.log('Org not found');
    return;
  }
  const orderCount = await prisma.order.count({ where: { organizationId: org.id } });
  console.log('Total orders for', org.name, ':', orderCount);

  const sampleOrders = await prisma.order.findMany({
    where: { organizationId: org.id },
    take: 5,
    select: { id: true, source: true, externalSource: true, metadata: true }
  });
  console.log('Sample orders:', JSON.stringify(sampleOrders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
