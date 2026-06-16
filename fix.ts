import prisma from './src/lib/db/prisma';

async function main() {
    const orders = await prisma.order.findMany({
        select: { id: true, lensConfig: true }
    });

    let updatedCount = 0;

    for (const order of orders) {
        if (!order.lensConfig || !(order.lensConfig as any).eyes) continue;

        let needsUpdate = false;
        const newConfig = { ...(order.lensConfig as any) };

        ['od', 'os'].forEach(eye => {
            if (newConfig.eyes[eye] && newConfig.eyes[eye].compression_factor < 0) {
                newConfig.eyes[eye].compression_factor = Math.abs(newConfig.eyes[eye].compression_factor);
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            await prisma.order.update({
                where: { id: order.id },
                data: { lensConfig: newConfig }
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
