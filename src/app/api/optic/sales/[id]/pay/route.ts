import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await req.json();
    const { paymentMethod } = body;

    const sale = await prisma.sale.findUnique({
        where: { id: params.id, organizationId: user.organizationId }
    });

    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    if (sale.paymentStatus === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

    const remainingDebt = sale.total - sale.paidAmount;
    if (remainingDebt <= 0) return NextResponse.json({ error: 'Invalid debt amount' }, { status: 400 });

    try {
        await prisma.$transaction(async (tx) => {
            // Update sale status
            await tx.sale.update({
                where: { id: sale.id },
                data: {
                    paidAmount: sale.total,
                    paymentStatus: 'paid'
                }
            });

            // Find active shift to record the payment
            const activeShift = await tx.cashShift.findFirst({
                where: {
                    status: 'open',
                    cashRegister: { organizationId: user.organizationId! }
                },
                orderBy: { openedAt: 'desc' }
            });

            if (activeShift) {
                const expectedDelta = paymentMethod === 'cash' ? remainingDebt : 0;
                
                await tx.cashShift.update({
                    where: { id: activeShift.id },
                    data: { expectedCash: { increment: expectedDelta } }
                });
                
                await tx.cashTransaction.create({
                    data: {
                        shiftId: activeShift.id,
                        cashRegisterId: activeShift.cashRegisterId,
                        transType: 'income',
                        paymentMethod: paymentMethod || 'cash',
                        category: 'sale', // or 'debt_repayment'
                        amount: remainingDebt,
                        createdById: user.id,
                        description: `Доплата по чеку ${sale.saleNumber}`
                    }
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[PayDebt] Error:', error);
        return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
    }
}
