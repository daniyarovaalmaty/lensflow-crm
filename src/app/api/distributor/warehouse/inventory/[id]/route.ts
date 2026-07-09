import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const inventoryId = params.id;

        if (!inventoryId) {
            return NextResponse.json({ error: 'ID ревизии обязателен' }, { status: 400 });
        }

        // Verify it belongs to the organization
        const inventory = await prisma.inventory.findUnique({
            where: { id: inventoryId }
        });

        if (!inventory || inventory.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: 'Ревизия не найдена' }, { status: 404 });
        }

        await prisma.inventory.delete({
            where: { id: inventoryId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting inventory:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
