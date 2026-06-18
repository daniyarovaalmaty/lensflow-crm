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
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            dateFilter = { gte: firstDay, lte: lastDay };
        }

        // 1. Get all users in the organization with their roles and payroll rules
        const staff = await prisma.user.findMany({
            where: { organizationId: user.organizationId },
            include: { payrollRules: true }
        });

        // 2. Calculate sales for each user in the given period
        // Sales are recorded in the Sale model with performedById, or CashTransaction with createdById. 
        // We will look at CashTransaction where category === 'sale'
        const salesTxs = await prisma.cashTransaction.groupBy({
            by: ['createdById'],
            where: {
                cashRegister: { organizationId: user.organizationId },
                category: 'sale',
                createdAt: dateFilter
            },
            _sum: {
                amount: true
            }
        });

        const salesMap = new Map();
        salesTxs.forEach(tx => {
            salesMap.set(tx.createdById, tx._sum.amount || 0);
        });

        const results = staff.map(st => {
            const rule = st.payrollRules[0] || { baseSalary: 0, salesPercent: 0 };
            const salesTotal = salesMap.get(st.id) || 0;
            const salesBonus = Math.round(salesTotal * (rule.salesPercent / 100));
            const totalEstimated = rule.baseSalary + salesBonus;

            return {
                user: { id: st.id, fullName: st.fullName, email: st.email, role: st.role, subRole: st.subRole },
                rule: { baseSalary: rule.baseSalary, salesPercent: rule.salesPercent },
                periodSalesTotal: salesTotal,
                estimatedSalesBonus: salesBonus,
                totalEstimated: totalEstimated
            };
        });

        return NextResponse.json({
            period: dateFilter,
            staffPayroll: results
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    try {
        const body = await req.json();
        const { action, targetUserId, baseSalary, salesPercent, periodStart, periodEnd, baseAmount, salesAmount } = body;

        if (action === 'update_rule') {
            const rule = await prisma.payrollRule.upsert({
                where: {
                    organizationId_userId: {
                        organizationId: user.organizationId,
                        userId: targetUserId
                    }
                },
                update: {
                    baseSalary: parseInt(baseSalary, 10),
                    salesPercent: parseFloat(salesPercent)
                },
                create: {
                    organizationId: user.organizationId,
                    userId: targetUserId,
                    baseSalary: parseInt(baseSalary, 10),
                    salesPercent: parseFloat(salesPercent)
                }
            });
            return NextResponse.json(rule);
        }

        if (action === 'generate_payout') {
            const totalAmount = parseInt(baseAmount, 10) + parseInt(salesAmount, 10);
            const payout = await prisma.payrollPayout.create({
                data: {
                    organizationId: user.organizationId,
                    userId: targetUserId,
                    periodStart: new Date(periodStart),
                    periodEnd: new Date(periodEnd),
                    baseAmount: parseInt(baseAmount, 10),
                    salesAmount: parseInt(salesAmount, 10),
                    totalAmount,
                    status: 'calculated'
                }
            });
            return NextResponse.json(payout);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
