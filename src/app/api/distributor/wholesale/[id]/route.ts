import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const orderId = params.id;
        
        const order = await prisma.wholesaleOrder.findUnique({
            where: { 
                id: orderId,
                organizationId: session.user.organizationId!
            },
            include: {
                counterparty: true,
                items: {
                    include: {
                        product: true
                    }
                },
                stockItems: true // to see which exact serials were reserved/sold
            }
        });

        if (!order) {
            return new NextResponse('Order not found', { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error('Error fetching wholesale order:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const orderId = params.id;
        const organizationId = session.user.organizationId!;

        const order = await prisma.wholesaleOrder.findUnique({
            where: { id: orderId, organizationId }
        });

        if (!order) {
            return new NextResponse('Order not found', { status: 404 });
        }

        if (order.status !== 'draft') {
            return new NextResponse('Только черновики можно удалить полностью. Если заказ в резерве, сначала отмените резерв.', { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            // Delete items first
            await tx.wholesaleOrderItem.deleteMany({
                where: { wholesaleOrderId: orderId }
            });
            
            // Delete order
            await tx.wholesaleOrder.delete({
                where: { id: orderId }
            });
        });

        return new NextResponse('Deleted', { status: 200 });
    } catch (error) {
        console.error('Error deleting wholesale order:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
