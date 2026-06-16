import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userOrgId = session.user.organizationId;
        if (!userOrgId) {
            return NextResponse.json({ error: 'No organization linked' }, { status: 400 });
        }

        const contractId = params.id;

        // Verify ownership (the contract should belong to the user's org or a branch of it)
        const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            include: { client: { select: { id: true, parentId: true } } }
        });

        if (!contract) {
            return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
        }

        if (contract.clientId !== userOrgId && contract.client?.parentId !== userOrgId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.contract.delete({
            where: { id: contractId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/optic/contracts/[id] Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
