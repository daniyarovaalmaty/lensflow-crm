import prisma from './src/lib/db/prisma.ts';

async function main() {
    const sale = await prisma.sale.findFirst({
        where: { saleNumber: 'S-ORG--0042' }
    });
    
    if (!sale) return console.log('sale not found');

    const activeShift = await prisma.cashShift.findFirst({
        where: { status: 'open', cashRegister: { organizationId: sale.organizationId } },
        orderBy: { openedAt: 'desc' }
    });

    console.log('activeShift', activeShift?.id);

    try {
        const method = 'cash';
        const amt = 300000;
        const expectedDelta = amt;
        
        await prisma.$transaction(async (tx) => {
            await tx.cashShift.update({
                where: { id: activeShift.id },
                data: { expectedCash: { increment: expectedDelta } }
            });
            
            await tx.cashTransaction.create({
                data: {
                    shiftId: activeShift.id,
                    cashRegisterId: activeShift.cashRegisterId,
                    transType: 'income',
                    paymentMethod: method,
                    category: 'sale',
                    amount: amt,
                    createdById: sale.performedById,
                    description: `Оплата заказа ${sale.saleNumber}`
                }
            });
        });
        console.log('Transaction succeeded!');
    } catch (e) {
        console.error('Failed:', e);
    }
}
main().catch(console.error).finally(() => process.exit(0));
