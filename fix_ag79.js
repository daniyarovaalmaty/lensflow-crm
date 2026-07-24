const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.order.updateMany({
        where: { orderNumber: 'AG79' },
        data: { status: 'new_order' }
    });
    console.log(`Fixed ${updated.count} orders`);
}
main();
