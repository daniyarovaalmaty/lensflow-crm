import prisma from '../src/lib/db/prisma';
async function main() {
    const products = await prisma.product.findMany({ where: { category: 'lens' } });
    console.log(JSON.stringify(products, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
