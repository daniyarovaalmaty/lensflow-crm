import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const organizationId = session.user.organizationId;
    if (!organizationId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        await prisma.supplier.delete({
            where: { id: params.id, organizationId }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete supplier:', error);
        return new NextResponse(error.message, { status: 400 });
    }
}
