import prisma from './src/lib/db/prisma.ts';

async function main() {
    const txs = await prisma.cashTransaction.findMany({
        where: { createdAt: { gte: new Date('2026-06-18T09:40:00Z') } },
        orderBy: { createdAt: 'desc' }
    });
    console.log(txs);
}
main().catch(console.error).finally(() => process.exit(0));
