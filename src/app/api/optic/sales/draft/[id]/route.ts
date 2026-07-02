import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
        if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

        const saleId = params.id;

        // Verify the sale belongs to the organization and is unpaid
        const sale = await prisma.sale.findFirst({
            where: { id: saleId, organizationId: user.organizationId }
        });

        if (!sale) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
        }

        if (sale.paymentStatus !== 'unpaid') {
            return NextResponse.json({ error: 'Only unpaid draft sales can be deleted' }, { status: 400 });
        }

        // Delete items and the sale
        await prisma.sale.delete({ where: { id: saleId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DraftSaleDelete] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
