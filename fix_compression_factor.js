const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.order.findMany({
        select: { id: true, config: true }
    });

    let updatedCount = 0;

    for (const order of orders) {
        if (!order.config || !order.config.eyes) continue;

        let needsUpdate = false;
        const newConfig = { ...order.config };

        ['od', 'os'].forEach(eye => {
            if (newConfig.eyes[eye] && newConfig.eyes[eye].compression_factor < 0) {
                newConfig.eyes[eye].compression_factor = Math.abs(newConfig.eyes[eye].compression_factor);
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            await prisma.order.update({
                where: { id: order.id },
                data: { config: newConfig }
            });
            updatedCount++;
            console.log(`Updated order ${order.id}`);
        }
    }

    console.log(`Done. Updated ${updatedCount} orders.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
