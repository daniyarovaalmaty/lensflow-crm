export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        // Allow lab manager to configure this
        if (!session?.user || session.user.role !== 'laboratory') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { requiresApproval } = body;

        await prisma.organization.update({
            where: { id: params.id },
            data: { requiresApproval },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PUT /api/counterparties/[id]/approval error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
