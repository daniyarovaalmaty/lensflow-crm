import prisma from './src/lib/db/prisma.ts';

async function main() {
    const ids = ['S-ORG--0037', 'S-ORG--0036', 'S-ORG--0035'];
    
    const sales = await prisma.sale.findMany({
        where: { saleNumber: { in: ids } },
        include: { items: true } // The cash transactions are linked differently or we just update sales
    });

    console.log("Updating sales...");
    for (const sale of sales) {
        // Change date to 16.06.2026 12:00:00
        const newDate = new Date("2026-06-16T12:00:00Z");

        await prisma.sale.update({
            where: { id: sale.id },
            data: { createdAt: newDate }
        });
        
        console.log(`Updated sale ${sale.saleNumber} to ${newDate}`);
    }

    // Now update CashTransactions that match the same criteria. Usually CashTransactions might have description containing the sale number, or we just find the ones created at the exact same minute. Let's just find CashTransactions by amount or let's find the ones linked to these sales if there is a link.
    // The CashTransaction model does NOT have a direct relation to Sale. It has shift, cashRegister, etc.
}

main().catch(console.error).finally(() => process.exit(0));
