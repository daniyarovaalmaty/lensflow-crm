import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ==================== GET — Single product with stock items ====================
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const product = await prisma.opticProduct.findFirst({
        where: { id, organizationId: user.organizationId },
        include: {
            stockItems: { orderBy: { receivedAt: 'desc' } },
            _count: { select: { stockItems: { where: { status: 'in_stock' } } } },
        },
    });

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
}

// ==================== PUT — Update product ====================
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (!['optic_manager', 'lab_head', 'lab_admin'].includes(user.subRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.opticProduct.findFirst({
        where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const type = body.category?.startsWith('service_') ? 'service' : (body.category ? 'product' : existing.type);

    const updated = await prisma.opticProduct.update({
        where: { id },
        data: {
            name: body.name ?? existing.name,
            category: body.category ?? existing.category,
            type,
            brand: body.brand !== undefined ? body.brand : existing.brand,
            model: body.model !== undefined ? body.model : existing.model,
            sku: body.sku !== undefined ? body.sku : existing.sku,
            barcode: body.barcode !== undefined ? body.barcode : existing.barcode,
            shortDescription: body.shortDescription !== undefined ? body.shortDescription : existing.shortDescription,
            fullDescription: body.fullDescription !== undefined ? body.fullDescription : existing.fullDescription,
            images: body.images !== undefined ? body.images : existing.images,
            specs: body.specs !== undefined ? body.specs : existing.specs,
            purchasePrice: body.purchasePrice !== undefined ? Number(body.purchasePrice) : existing.purchasePrice,
            retailPrice: body.retailPrice !== undefined ? Number(body.retailPrice) : existing.retailPrice,
            minStock: body.minStock !== undefined ? Number(body.minStock) : existing.minStock,
            unit: body.unit ?? existing.unit,
            trackSerials: body.trackSerials !== undefined ? Boolean(body.trackSerials) : existing.trackSerials,
            isPublic: body.isPublic !== undefined ? Boolean(body.isPublic) : existing.isPublic,
            isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
        },
    });

    return NextResponse.json(updated);
}

// ==================== DELETE — Soft delete (deactivate) ====================
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (!['optic_manager', 'lab_head', 'lab_admin'].includes(user.subRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.opticProduct.findFirst({
        where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.opticProduct.update({
        where: { id },
        data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
}
