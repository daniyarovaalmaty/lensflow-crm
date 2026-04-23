import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// ==================== GET — List products for user's organization ====================
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const active = searchParams.get('active');
    const search = searchParams.get('search');

    const where: any = { organizationId: user.organizationId };
    if (category) where.category = category;
    if (type) where.type = type;
    if (active !== null && active !== '') where.isActive = active === 'true';
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
        ];
    }

    const products = await prisma.opticProduct.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
            _count: { select: { stockItems: { where: { status: 'in_stock' } } } },
        },
    });

    return NextResponse.json(products);
}

// ==================== POST — Create a product ====================
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    // Only optic_manager or lab_head can manage products
    if (!['optic_manager', 'lab_head', 'lab_admin'].includes(user.subRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    // Generate slug from name
    const slug = body.name
        ?.toLowerCase()
        .replace(/[^a-zа-я0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100);

    // Determine type from category
    const type = body.category?.startsWith('service_') ? 'service' : 'product';

    const product = await prisma.opticProduct.create({
        data: {
            organizationId: user.organizationId,
            name: body.name,
            slug,
            category: body.category,
            type,
            brand: body.brand || null,
            model: body.model || null,
            sku: body.sku || null,
            barcode: body.barcode || null,
            shortDescription: body.shortDescription || null,
            fullDescription: body.fullDescription || null,
            images: body.images || [],
            specs: body.specs || null,
            purchasePrice: Number(body.purchasePrice) || 0,
            retailPrice: Number(body.retailPrice) || 0,
            minStock: Number(body.minStock) || 0,
            unit: body.unit || 'шт',
            trackSerials: Boolean(body.trackSerials),
            isPublic: Boolean(body.isPublic),
            isActive: true,
        },
    });

    return NextResponse.json(product, { status: 201 });
}
