import prisma from './src/lib/db/prisma.ts';

async function main() {
    // Find the latest expense transaction for 110000
    const tx = await prisma.cashTransaction.findFirst({
        where: { amount: 110000, transType: { in: ['expense', 'cash_out'] } },
        orderBy: { createdAt: 'desc' },
        include: { cashRegister: true }
    });

    if (!tx) {
        console.log('Transaction not found');
        return;
    }

    const user = await prisma.user.findUnique({ where: { id: tx.createdById } });
    if (!user) return;

    const accountName = `Касса: ${tx.cashRegister.name}`;
    let account = await prisma.companyAccount.findFirst({
        where: { organizationId: user.organizationId, name: accountName }
    });

    if (!account) {
        account = await prisma.companyAccount.create({
            data: {
                name: accountName,
                organizationId: user.organizationId,
                balance: 0,
                isActive: true
            }
        });
    }

    // Check if already exists to prevent duplicate
    const existing = await prisma.financialTransaction.findFirst({
        where: { description: { contains: tx.description || 'Оплата Тони' }, amount: 110000 }
    });

    if (!existing) {
        await prisma.financialTransaction.create({
            data: {
                accountId: account.id,
                organizationId: user.organizationId,
                type: 'expense',
                category: tx.category === 'other' ? 'other' : tx.category,
                amount: tx.amount,
                description: `[Изъятие из кассы] ${tx.description || ''}`,
                createdById: user.id,
                date: tx.createdAt
            }
        });
        
        await prisma.companyAccount.update({
            where: { id: account.id },
            data: { balance: { decrement: tx.amount } }
        });
        
        console.log(`Successfully migrated the 110,000 expense to global finances.`);
    } else {
        console.log(`Already migrated.`);
    }
}

main().catch(console.error).finally(() => process.exit(0));
