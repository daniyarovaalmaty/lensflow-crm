import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    try {
        const url = new URL(req.url);
        const start = url.searchParams.get('start');
        const end = url.searchParams.get('end');

        let dateFilter = {};
        if (start && end) {
            dateFilter = {
                gte: new Date(start),
                lte: new Date(end)
            };
        } else {
            // Default: current month
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            dateFilter = {
                gte: firstDay,
                lte: lastDay
            };
        }

        // 1. Get global financial transactions
        const txs = await prisma.financialTransaction.findMany({
            where: {
                organizationId: user.organizationId,
                date: dateFilter
            }
        });

        // 2. Get cash shift transactions
        const cashTxs = await prisma.cashTransaction.findMany({
            where: {
                cashRegister: { organizationId: user.organizationId },
                createdAt: dateFilter
            }
        });

        let totalIncome = 0;
        let totalExpense = 0;

        // Summarize global transactions
        txs.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            if (t.type === 'expense') totalExpense += t.amount;
        });

        // Summarize cash shift transactions
        cashTxs.forEach(t => {
            // we only count sales or distinct incomes, ignore cash_in/out (which are just register movements)
            if (t.transType === 'income' || (t.transType === 'cash_in' && t.category !== 'other')) {
                 totalIncome += t.amount;
            }
            // We NO LONGER count cash_out/expense here because they automatically create a FinancialTransaction 
            // in the global module (linked to the CashRegister CompanyAccount).
        });

        const netProfit = totalIncome - totalExpense;

        return NextResponse.json({
            period: dateFilter,
            summary: {
                totalIncome,
                totalExpense,
                netProfit
            },
            globalTransactionsCount: txs.length,
            cashTransactionsCount: cashTxs.length
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
