import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: {
      OR: [
        { customerName: { contains: 'Аяна', mode: 'insensitive' } },
        { customerName: { contains: 'Рахат', mode: 'insensitive' } }
      ]
    },
    include: { items: true },
    take: 10
  });
  console.dir(sales.map(s => ({ name: s.customerName, total: s.total, items: s.items.map(i => ({ name: i.name, total: i.total })) })), { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
