import prisma from './src/lib/db/prisma';

async function main() {
  const sale = await prisma.sale.findUnique({ where: { id: "cmpzj1p74000x53wtic9f2f2y" } });
  console.log(sale);
}
main().catch(console.error);
