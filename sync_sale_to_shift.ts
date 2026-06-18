import prisma from './src/lib/db/prisma.ts';

async function main() {
    // Find the latest sale of 130000 by card
    const sale = await prisma.sale.findFirst({
        where: { total: 130000, paymentMethod: 'card' },
        orderBy: { createdAt: 'desc' }
    });

    if (!sale) {
        console.log('Sale not found');
        return;
    }

    // Find the active shift
    const activeShift = await prisma.cashShift.findFirst({
        where: { status: 'open', cashRegister: { organizationId: sale.organizationId } },
        orderBy: { openedAt: 'desc' }
    });

    if (!activeShift) {
        console.log('No active shift found');
        return;
    }

    // Check if already synced
    const existingTx = await prisma.cashTransaction.findFirst({
        where: { shiftId: activeShift.id, description: { contains: sale.saleNumber } }
    });

    if (!existingTx) {
        await prisma.cashTransaction.create({
            data: {
                shiftId: activeShift.id,
                cashRegisterId: activeShift.cashRegisterId,
                transType: 'income',
                paymentMethod: 'card',
                category: 'sale',
                amount: sale.total,
                createdById: sale.performedById,
                description: `Оплата заказа ${sale.saleNumber}`
            }
        });
        console.log(`Successfully added 130,000 card sale (${sale.saleNumber}) to the active shift.`);
    } else {
        console.log('Already synced to shift.');
    }
}

main().catch(console.error).finally(() => process.exit(0));
