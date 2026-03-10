export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

// DELETE /api/orders/delete-all — removes ALL orders (test data cleanup)
export async function DELETE() {
    try {
        // Delete in order due to FK constraints
        await prisma.$executeRawUnsafe(`DELETE FROM "defects"`);
        await prisma.$executeRawUnsafe(`DELETE FROM "order_products"`);
        await prisma.$executeRawUnsafe(`DELETE FROM "orders"`);

        return NextResponse.json({ message: 'Все заказы удалены' });
    } catch (error: any) {
        console.error('Failed to delete orders:', error);
        return NextResponse.json(
            { error: 'Failed to delete orders', details: error.message },
            { status: 500 }
        );
    }
}
