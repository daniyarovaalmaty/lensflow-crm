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
            },
            include: { account: true }
        });

        // 2. Get cash shift transactions
        const cashTxs = await prisma.cashTransaction.findMany({
            where: {
                cashRegister: { organizationId: user.organizationId },
                createdAt: dateFilter
            }
        });

        // 3. Get all sales for this period
        const sales = await prisma.sale.findMany({
            where: {
                organizationId: user.organizationId,
                createdAt: dateFilter,
                paymentStatus: { not: 'refunded' }
            }
        });

        let totalIncome = 0;
        let totalExpense = 0;
        let incomeCash = 0;
        let incomeNonCash = 0;

        // Add sales revenue
        sales.forEach(s => {
            totalIncome += s.total;
            if (s.paymentMethod === 'cash') {
                incomeCash += s.total;
            } else if (s.paymentMethod === 'mixed' && s.invoiceData) {
                const inv = s.invoiceData as any;
                if (inv.split && Array.isArray(inv.split)) {
                    inv.split.forEach((sp: any) => {
                        if (sp.method === 'cash') incomeCash += Number(sp.amount);
                        else incomeNonCash += Number(sp.amount);
                    });
                } else if (inv.splitPayment) {
                    incomeCash += Number(inv.splitPayment.cash || 0);
                    incomeNonCash += Number(inv.splitPayment.kaspi || 0) + Number(inv.splitPayment.card || 0) + Number(inv.splitPayment.transfer || 0);
                } else {
                    incomeNonCash += s.total; // fallback
                }
            } else {
                incomeNonCash += s.total;
            }
        });

        // Summarize global transactions
        txs.forEach(t => {
            if (t.type === 'income') {
                totalIncome += t.amount;
                if (t.account?.name?.toLowerCase().includes('касса')) {
                    incomeCash += t.amount;
                } else {
                    incomeNonCash += t.amount;
                }
            }
            if (t.type === 'expense') totalExpense += t.amount;
        });

        // Summarize cash shift transactions
        cashTxs.forEach(t => {
            // we only count distinct incomes (not sales, since they are already counted above)
            if (t.transType === 'income' && t.category !== 'sale') {
                 totalIncome += t.amount;
                 if (t.paymentMethod === 'cash') incomeCash += t.amount; else incomeNonCash += t.amount;
            } else if (t.transType === 'cash_in' && t.category !== 'other' && t.category !== 'sale') {
                 totalIncome += t.amount;
                 if (t.paymentMethod === 'cash') incomeCash += t.amount; else incomeNonCash += t.amount;
            }
        });

        const netProfit = totalIncome - totalExpense;

        return NextResponse.json({
            period: dateFilter,
            summary: {
                totalIncome,
                incomeCash,
                incomeNonCash,
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
