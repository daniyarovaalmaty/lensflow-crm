import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    // Find closed shifts in this organization
    const closedShifts = await prisma.cashShift.findMany({
        where: {
            cashRegister: { organizationId: user.organizationId },
            status: 'closed',
        },
        include: {
            cashRegister: true,
            openedBy: { select: { fullName: true, email: true } },
            closedBy: { select: { fullName: true, email: true } },
            transactions: {
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: { select: { fullName: true, email: true } },
                },
            },
        },
        orderBy: { closedAt: 'desc' },
        take: 30, // Limit to recent 30 shifts
    });

    const mappedShifts = closedShifts.map(shift => {
        const actual = shift.actualCash || 0;
        const expected = shift.expectedCash || 0;
        return {
            id: shift.id,
            cash_register_name: shift.cashRegister.name,
            opened_by_name: shift.openedBy.fullName || shift.openedBy.email,
            closed_by_name: shift.closedBy?.fullName || shift.closedBy?.email || '—',
            starting_cash: shift.startingCash,
            expected_cash: expected,
            actual_cash: actual,
            discrepancy: actual - expected,
            opened_at: shift.openedAt.toISOString(),
            closed_at: shift.closedAt?.toISOString() || null,
            transactions: shift.transactions.map(t => ({
                id: t.id,
                trans_type: t.transType,
                payment_method: t.paymentMethod,
                category: t.category,
                amount: t.amount,
                created_by_name: t.createdBy.fullName || t.createdBy.email,
                created_at: t.createdAt.toISOString(),
                description: t.description,
                kaspi_transaction_id: t.kaspiTransactionId,
                kaspi_status: t.kaspiStatus,
            })),
        };
    });

    return NextResponse.json(mappedShifts);
}
