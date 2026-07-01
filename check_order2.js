const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const order = await prisma.order.findFirst({ where: { orderNumber: "AC56" } });
    console.log(JSON.stringify(order?.config, null, 2));
}
main().finally(() => prisma.$disconnect());
