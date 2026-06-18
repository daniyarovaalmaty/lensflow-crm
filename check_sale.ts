import prisma from './src/lib/db/prisma.ts';

async function main() {
    const sale = await prisma.sale.findFirst({
        where: { saleNumber: 'S-ORG--0042' },
        include: { items: true }
    });
    console.log('Sale:', sale);

    const txs = await prisma.cashTransaction.findMany({
        where: { description: { contains: 'S-ORG--0042' } }
    });
    console.log('Txs for S-ORG--0042:', txs);

    const activeShift = await prisma.cashShift.findFirst({
        where: { status: 'open' },
        orderBy: { openedAt: 'desc' }
    });
    console.log('Active shift:', activeShift);
}
main().catch(console.error).finally(() => process.exit(0));
