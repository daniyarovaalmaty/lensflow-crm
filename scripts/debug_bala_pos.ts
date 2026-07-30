import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Fetching BalaVision org via user...');
    const user = await prisma.user.findUnique({
        where: { email: 'reception_bala@lensflow.kz' },
        include: { organization: true }
    });
    
    if (!user || !user.organization) {
        console.log('User or Org not found');
        return;
    }
    const org = user.organization;
    console.log('Org ID:', org.id);

    console.log('\nFetching today\'s sales...');
    const sales = await prisma.sale.findMany({
        where: {
            organizationId: org.id,
            createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, saleNumber: true, total: true, paidAmount: true, createdAt: true }
    });
    console.table(sales);

    console.log('\nFetching today\'s open shifts...');
    const shifts = await prisma.cashShift.findMany({
        where: {
            cashRegister: { organizationId: org.id },
            openedAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
        },
        orderBy: { openedAt: 'asc' },
        select: { id: true, status: true, openedAt: true, expectedCash: true, cashRegisterId: true }
    });
    console.table(shifts);

    const shift = shifts[0];
    console.log('\nTransactions for shift', shift.id);
    const txs = await prisma.cashTransaction.findMany({
        where: { shiftId: shift.id },
        select: { id: true, amount: true, description: true, paymentMethod: true, createdAt: true }
    });
    console.table(txs);

    const missingSale = sales.find(s => s.saleNumber === 'S-CMRU-0025');
    if (missingSale) {
        console.log('\nInserting missing transaction for S-CMRU-0025...');
        const newTx = await prisma.cashTransaction.create({
            data: {
                shiftId: shift.id,
                cashRegisterId: shift.cashRegisterId,
                transType: 'income',
                paymentMethod: 'card', // From screenshot
                category: 'sale',
                amount: missingSale.paidAmount,
                createdById: user.id,
                description: `Оплата заказа ${missingSale.saleNumber}`,
                createdAt: missingSale.createdAt // Use the sale's timestamp
            }
        });
        console.log('Inserted:', newTx);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
