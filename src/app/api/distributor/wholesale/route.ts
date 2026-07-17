import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

function generateOrderNumber() {
    const min = 100000;
    const max = 999999;
    return `WHO-${Math.floor(Math.random() * (max - min + 1)) + min}`;
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);

        const orders = await prisma.wholesaleOrder.findMany({
            where: { organizationId: session.user.organizationId! },
            include: {
                counterparty: {
                    select: { id: true, name: true }
                },
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });

        const total = await prisma.wholesaleOrder.count({
            where: { organizationId: session.user.organizationId! },
        });

        return NextResponse.json({ orders, total });
    } catch (error) {
        console.error('Error fetching wholesale orders:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { counterpartyId, items, notes } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return new NextResponse('Items are required', { status: 400 });
        }

        const totalAmount = items.reduce((sum: number, item: any) => sum + item.total, 0);

        const order = await prisma.wholesaleOrder.create({
            data: {
                orderNumber: generateOrderNumber(),
                organizationId: session.user.organizationId!,
                counterpartyId: counterpartyId || null,
                notes: notes || '',
                totalAmount,
                status: 'draft',
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        stockItemId: item.stockItemId || null,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.total
                    }))
                }
            },
            include: {
                items: true,
                counterparty: true,
            }
        });

        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error('Error creating wholesale order:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
