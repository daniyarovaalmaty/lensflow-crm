import prisma from './src/lib/db/prisma.ts';
async function main() {
    const txs = await prisma.cashTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.log(txs.map(t => ({ id: t.id, amount: t.amount, desc: t.description, cat: t.category, method: t.paymentMethod, type: t.transType, created: t.createdAt })));
}
main().catch(console.error).finally(() => process.exit(0));
