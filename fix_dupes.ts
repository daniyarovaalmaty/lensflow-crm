import prisma from './src/lib/db/prisma.ts';

async function main() {
    const deleteIds = ['cmqji32jc000104juk46dpx4c', 'cmqji31pd000004ju0s3fnhu4', 'cmqjh6h47000304lgtke96vst'];
    
    await prisma.$transaction(async (tx) => {
        for (const id of deleteIds) {
            const t = await tx.cashTransaction.findUnique({ where: { id } });
            if (t) {
                await tx.cashTransaction.delete({ where: { id } });
                await tx.cashShift.update({
                    where: { id: t.shiftId },
                    data: { expectedCash: { increment: t.amount } }
                });
                console.log(`Deleted ${t.amount} and updated shift.`);
            }
        }
    });
}
main().catch(console.error).finally(() => process.exit(0));
