import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

/**
 * PUT /api/catalog/[id] — update product
 * Only lab_head and lab_admin
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const sub = session.user.subRole;
        if (sub !== 'lab_head' && sub !== 'lab_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, category, sku, description, price, unit, isActive, sortOrder } = body;

        const updateData: any = {};
        if (typeof name === 'string') updateData.name = name;
        if (typeof category === 'string') updateData.category = category;
        if (typeof sku === 'string') updateData.sku = sku || null;
        if (typeof description === 'string') updateData.description = description || null;
        if (price !== undefined) updateData.price = Number(price);
        if (typeof unit === 'string') updateData.unit = unit;
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);

        const product = await prisma.product.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(product);
    } catch (error: any) {
        console.error('PUT /api/catalog/[id] error:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

/**
 * DELETE /api/catalog/[id] — soft delete (set isActive = false)
 * Only lab_head and lab_admin
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const sub = session.user.subRole;
        if (sub !== 'lab_head' && sub !== 'lab_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;

        await prisma.product.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('DELETE /api/catalog/[id] error:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
