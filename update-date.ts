import { prisma } from './src/lib/db/prisma';

async function main() {
    const sale = await prisma.sale.findFirst({
        where: {
            saleNumber: 'S-ORG--0068'
        }
    });
    
    if (sale) {
        console.log('Found sale:', sale.id, sale.saleNumber, sale.createdAt);
        await prisma.sale.update({
            where: { id: sale.id },
            data: { createdAt: new Date('2026-06-22T16:02:00.000Z') }
        });
        console.log('Successfully updated sale date to 2026-06-22');
    } else {
        console.log('Sale not found.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
