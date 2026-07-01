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
            dateFilter = { gte: firstDay, lte: lastDay };
        }

        const txs = await prisma.financialTransaction.findMany({
            where: { 
                organizationId: user.organizationId,
                date: dateFilter
            },
            orderBy: { date: 'desc' },
            include: {
                account: { select: { name: true } },
                createdBy: { select: { fullName: true, email: true } },
                linkedUser: { select: { fullName: true } }
            },
        });

        return NextResponse.json(txs);
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
        const { accountId, type, category, amount, description, date, linkedUserId } = body;

        if (!accountId || !type || !category || amount === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const txAmt = Math.round(Number(amount));
        const expectedDelta = type === 'income' ? txAmt : -txAmt;

        const newTx = await prisma.$transaction(async (tx) => {
            // Update account balance
            await tx.companyAccount.update({
                where: { id: accountId },
                data: {
                    balance: { increment: expectedDelta }
                }
            });

            // Create transaction
            return await tx.financialTransaction.create({
                data: {
                    organizationId: user.organizationId!,
                    accountId,
                    type,
                    category,
                    amount: txAmt,
                    description,
                    date: date ? new Date(date) : new Date(),
                    createdById: user.id,
                    linkedUserId: linkedUserId || null
                },
                include: {
                    account: { select: { name: true } },
                    createdBy: { select: { fullName: true } },
                    linkedUser: { select: { fullName: true } }
                }
            });
        });

        return NextResponse.json(newTx, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
