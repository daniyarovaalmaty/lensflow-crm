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
        const accounts = await prisma.companyAccount.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { createdAt: 'asc' },
        });

        // Calculate total cash from sales to add to the main cash register
        const sales = await prisma.sale.findMany({
            where: {
                organizationId: user.organizationId,
                paymentStatus: { not: 'refunded' }
            }
        });
        
        let totalCashFromSales = 0;
        sales.forEach(s => {
            if (s.paymentMethod === 'cash') {
                totalCashFromSales += s.total;
            } else if (s.paymentMethod === 'mixed' && s.invoiceData) {
                const inv = s.invoiceData as any;
                if (inv.split && Array.isArray(inv.split)) {
                    inv.split.forEach((sp: any) => {
                        if (sp.method === 'cash') totalCashFromSales += Number(sp.amount);
                    });
                } else {
                    totalCashFromSales += Number(inv.cashAmount || inv.cash || 0);
                }
            }
        });

        let addedCash = false;
        const modifiedAccounts = accounts.map(acc => {
            const nameLower = acc.name.toLowerCase();
            const isCashAccount = nameLower.includes('касса') || nameLower.includes('наличн') || nameLower === 'основная касса';
            if (isCashAccount && !addedCash) {
                addedCash = true;
                return { ...acc, balance: acc.balance + totalCashFromSales };
            }
            return acc;
        });

        return NextResponse.json(modifiedAccounts);
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
        const { name, initialBalance } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const account = await prisma.companyAccount.create({
            data: {
                organizationId: user.organizationId,
                name,
                balance: initialBalance ? parseInt(initialBalance, 10) : 0,
            },
        });

        return NextResponse.json(account, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
