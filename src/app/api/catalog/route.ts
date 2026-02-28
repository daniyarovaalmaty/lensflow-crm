import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/catalog — list all active products
 * Available to all authenticated users
 * Query params: ?category=lens&include_inactive=true
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const includeInactive = searchParams.get('include_inactive') === 'true';

        const where: any = {};
        if (!includeInactive) {
            where.isActive = true;
        }
        if (category) {
            where.category = category;
        }

        const products = await prisma.product.findMany({
            where,
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' },
            ],
        });

        // Strip prices for doctors
        const role = session.user.role;
        const subRole = session.user.subRole;

        if (role === 'doctor' || subRole === 'optic_doctor') {
            const stripped = products.map(({ price, ...rest }: any) => rest);
            return NextResponse.json(stripped);
        }

        return NextResponse.json(products);
    } catch (error) {
        console.error('GET /api/catalog error:', error);
        return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
    }
}

/**
 * POST /api/catalog — create new product
 * Only lab_head and lab_admin
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const sub = session.user.subRole;
        if (sub !== 'lab_head' && sub !== 'lab_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { name, category, sku, description, price, unit, sortOrder } = body;

        if (!name || !category) {
            return NextResponse.json({ error: 'name and category are required' }, { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                name,
                category,
                sku: sku || undefined,
                description: description || undefined,
                price: Number(price) || 0,
                unit: unit || 'шт',
                sortOrder: Number(sortOrder) || 0,
            },
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/catalog error:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
