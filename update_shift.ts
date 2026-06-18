import prisma from './src/lib/db/prisma.ts';

async function main() {
    const openShifts = await prisma.cashShift.findMany({
        where: { status: 'open' }
    });

    console.log(`Found ${openShifts.length} open shifts.`);

    for (const shift of openShifts) {
        // Recalculate expected cash
        const transactions = await prisma.cashTransaction.findMany({
            where: { shiftId: shift.id }
        });

        let expectedCash = 0; // Starting from 0 instead of shift.startingCash
        for (const tx of transactions) {
            if (tx.transType === 'income') {
                expectedCash += tx.amount;
            } else if (tx.transType === 'expense') {
                expectedCash -= tx.amount;
            }
        }

        await prisma.cashShift.update({
            where: { id: shift.id },
            data: { 
                startingCash: 0,
                expectedCash: expectedCash
            }
        });

        // Also update CashRegister's currentBalance to reflect this
        const register = await prisma.cashRegister.findUnique({
            where: { id: shift.cashRegisterId }
        });
        
        if (register) {
            // Ideally we'd calculate all history but let's just subtract the previous starting cash
            await prisma.cashRegister.update({
                where: { id: register.id },
                data: { currentBalance: Math.max(0, register.currentBalance - shift.startingCash) }
            });
        }
        
        console.log(`Updated shift ${shift.id} to 0 starting balance.`);
    }
}

main().catch(console.error).finally(() => process.exit(0));
