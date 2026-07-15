const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Get the order AG16
    const order = await prisma.order.findFirst({
        where: { orderNumber: { contains: 'AG' } },
        include: { organization: true }
    });
    console.log("Found Order:", order ? order.orderNumber : 'null');
    if (order) {
        console.log("Order Org ID:", order.organizationId);
        console.log("Order Org Name:", order.organization?.name);
        console.log("Order Org Type:", order.organization?.type);
        console.log("Order Org ParentId:", order.organization?.parentId);
    }

    // 2. Who is the user that can see 'Оптика Народная'?
    const users = await prisma.user.findMany({
        where: { role: 'optic' },
        include: { organization: true }
    });
    for (const u of users) {
        if (u.organization?.name?.includes('Оптика Народная')) {
            console.log("\nUser:", u.email, "| SubRole:", u.subRole);
            console.log("User Org ID:", u.organizationId);
            console.log("User Org Name:", u.organization?.name);
            console.log("User Org Type:", u.organization?.type);
        }
    }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
