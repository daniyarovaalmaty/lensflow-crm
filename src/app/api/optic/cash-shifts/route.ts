import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ==================== GET — Check active shift ====================
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const orgIdParam = req.nextUrl.searchParams.get('orgId');
    const targetOrgId = (orgIdParam && orgIdParam !== 'all') ? orgIdParam : user.organizationId;

    // Find active (open) shift in this organization
    const activeShift = await prisma.cashShift.findFirst({
        where: {
            cashRegister: { organizationId: targetOrgId },
            status: 'open',
        },
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

    if (!activeShift) {
        return NextResponse.json(null);
    }

    // Map to camelCase format expected by the frontend
    const mappedShift = {
        id: activeShift.id,
        cash_register_name: activeShift.cashRegister.name,
        cash_register_id: activeShift.cashRegister.id,
        opened_by_name: activeShift.openedBy.fullName || activeShift.openedBy.email,
        status: activeShift.status,
        starting_cash: activeShift.startingCash,
        expected_cash: activeShift.expectedCash,
        opened_at: activeShift.openedAt.toISOString(),
        transactions: activeShift.transactions.map(t => ({
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

// ==================== POST — Open cash shift ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await req.json();
    const { cashRegisterId, startingCash } = body;

    if (!cashRegisterId || startingCash === undefined) {
        return NextResponse.json({ error: 'Missing register ID or starting cash' }, { status: 400 });
    }

    // Verify register belongs to organization
    const register = await prisma.cashRegister.findFirst({
        where: { id: cashRegisterId, organizationId: user.organizationId },
    });
    if (!register) {
        return NextResponse.json({ error: 'Cash register not found' }, { status: 404 });
    }

    // Check if there is already an open shift in organization
    const existingShift = await prisma.cashShift.findFirst({
        where: {
            cashRegister: { organizationId: user.organizationId },
            status: 'open',
        },
    });
    if (existingShift) {
        return NextResponse.json({ error: 'A shift is already open in your organization' }, { status: 400 });
    }

    const startAmt = Math.round(Number(startingCash));

    // Open shift
    const shift = await prisma.cashShift.create({
        data: {
            cashRegisterId,
            openedById: user.id,
            status: 'open',
            startingCash: startAmt,
            expectedCash: startAmt, // expected matches starting initially
        },
        include: {
            cashRegister: true,
            openedBy: { select: { fullName: true, email: true } },
        },
    });

    return NextResponse.json({
        id: shift.id,
        cash_register_name: shift.cashRegister.name,
        opened_by_name: shift.openedBy.fullName || shift.openedBy.email,
        status: shift.status,
        starting_cash: shift.startingCash,
        expected_cash: shift.expectedCash,
        opened_at: shift.openedAt.toISOString(),
    }, { status: 201 });
}
