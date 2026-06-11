import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const order = await prisma.order.findFirst({
        where: { orderNumber: 'AC23' },
    });
    console.log("Order total:", order?.totalPrice);
    console.log("Order discount:", order?.discountPercent);
    console.log("Config qty:", (order?.lensConfig as any)?.eyes?.od?.qty, (order?.lensConfig as any)?.eyes?.os?.qty);

    const products = await prisma.product.findMany({ where: { category: 'lens' } });
    for (const p of products) {
        if (p.description === 'toric') {
            console.log("Toric:", p.priceByDk, p.distributorPriceByDk);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
