import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ==================== GET — Shift details ====================
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { id } = params;

    const shift = await prisma.cashShift.findUnique({
        where: { id },
        include: {
            cashRegister: true,
            openedBy: { select: { fullName: true, email: true } },
            transactions: {
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: { select: { fullName: true, email: true } },
                },
            },
        },
    });

    if (!shift) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    // Verify ownership
    if (shift.cashRegister.organizationId !== user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const mappedShift = {
        id: shift.id,
        cash_register_name: shift.cashRegister.name,
        cash_register_id: shift.cashRegister.id,
        opened_by_name: shift.openedBy.fullName || shift.openedBy.email,
        status: shift.status,
        starting_cash: shift.startingCash,
        expected_cash: shift.expectedCash,
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

    return NextResponse.json(mappedShift);
}

// ==================== POST — Shift actions ====================
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { id } = params;
    const body = await req.json();
    const { action } = body;

    const shift = await prisma.cashShift.findUnique({
        where: { id },
        include: { cashRegister: true },
    });

    if (!shift) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    if (shift.cashRegister.organizationId !== user.organizationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (shift.status !== 'open') {
        return NextResponse.json({ error: 'Shift is already closed' }, { status: 400 });
    }

    // ---- ACTION: CLOSE SHIFT ----
    if (action === 'close') {
        const { actual_cash } = body;
        if (actual_cash === undefined) {
            return NextResponse.json({ error: 'Missing actual cash' }, { status: 400 });
        }

        const actCash = Math.round(Number(actual_cash));
        const diff = actCash - shift.expectedCash;

        // Transactionally close shift and update register balance
        const updatedShift = await prisma.$transaction(async (tx) => {
            // Update register balance
            await tx.cashRegister.update({
                where: { id: shift.cashRegisterId },
                data: {
                    currentBalance: {
                        set: actCash, // balance is equal to actual cash inside after close
                    },
                },
            });

            // Close shift
            return await tx.cashShift.update({
                where: { id },
                data: {
                    status: 'closed',
                    closedById: user.id,
                    closedAt: new Date(),
                    actualCash: actCash,
                    difference: diff,
                },
            });
        });

        return NextResponse.json({ ok: true, shift: updatedShift });
    }

    // ---- ACTION: ADD TRANSACTION ----
    if (action === 'add_transaction') {
        const { trans_type, amount, payment_method, category, description, kaspi_transaction_id, kaspi_status } = body;

        if (!trans_type || amount === undefined || !payment_method || !category) {
            return NextResponse.json({ error: 'Missing required transaction fields' }, { status: 400 });
        }

        const txAmt = Math.round(Number(amount));
        let expectedDelta = 0;

        // In cash registers, cash_in and income increase cash expected, cash_out and expense decrease it
        if (trans_type === 'income' || trans_type === 'cash_in') {
            expectedDelta = txAmt;
        } else if (trans_type === 'expense' || trans_type === 'cash_out') {
            expectedDelta = -txAmt;
        }

        const newTx = await prisma.$transaction(async (tx) => {
            // Update shift expected cash
            await tx.cashShift.update({
                where: { id },
                data: {
                    expectedCash: {
                        increment: expectedDelta,
                    },
                },
            });

            // Create cash transaction
            return await tx.cashTransaction.create({
                data: {
                    shiftId: id,
                    cashRegisterId: shift.cashRegisterId,
                    transType: trans_type,
                    paymentMethod: payment_method,
                    category,
                    amount: txAmt,
                    createdById: user.id,
                    description: description || null,
                    kaspiTransactionId: kaspi_transaction_id || null,
                    kaspiStatus: kaspi_status || null,
                },
            });
        });

        return NextResponse.json({ ok: true, transaction: newTx }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
