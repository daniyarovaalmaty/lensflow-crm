import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

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

        const searchParams = (request as any).nextUrl.searchParams;
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
            select: {
                id: true,
                name: true,
                category: true,
                sku: true,
                name1c: true,
                code: true,
                description: true,
                price: true,
                priceByDk: true,
                distributorPriceByDk: true,
                unit: true,
                isActive: true,
                sortOrder: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: [
                { sortOrder: 'asc' },
                { name: 'asc' },
            ],
        });

        // Strip prices only for clinic doctors (optic_doctor)
        const subRole = session.user.subRole;

        if (['optic_doctor', 'optic_ophthalmologist', 'optic_orthokeratologist'].includes(subRole)) {
            const stripped = products.map(({ price, name1c, code, ...rest }: any) => rest);
            return NextResponse.json(stripped);
        }

        // For distributors and optics — apply their custom priceList if it exists
        if ((session.user.role === 'distributor' || session.user.role === 'optic') && session.user.organizationId) {
            let effectiveOrgId = session.user.organizationId;
            let priceList: any = null;

            const org = await prisma.organization.findUnique({
                where: { id: effectiveOrgId },
                select: { metadata: true, parentId: true },
            });
            priceList = (org?.metadata as any)?.priceList;

            if (!priceList && org?.parentId) {
                const parentOrg = await prisma.organization.findUnique({
                    where: { id: org.parentId },
                    select: { metadata: true },
                });
                priceList = (parentOrg?.metadata as any)?.priceList;
            }

            if (priceList?.lenses) {
                const patched = products.map((product: any) => {
                    if (product.category !== 'lens') return product;
                    const desc = product.description || '';
                    
                    if (desc.startsWith('toric_') && priceList.lenses.toric) {
                        const dk = desc.split('_')[1];
                        const customPrice = priceList.lenses.toric[dk];
                        if (customPrice != null) return { ...product, price: customPrice };
                    }
                    if (desc.startsWith('spherical_') && priceList.lenses.spherical) {
                        const dk = desc.split('_')[1];
                        const customPrice = priceList.lenses.spherical[dk];
                        if (customPrice != null) return { ...product, price: customPrice };
                    }
                    if ((desc === 'probe' || desc === 'rgp') && priceList.lenses.probe) {
                        // Trial is typically DK 50 in custom lists
                        const customPrice = priceList.lenses.probe['50'];
                        if (customPrice != null) return { ...product, price: customPrice };
                    }
                    return product;
                });
                return NextResponse.json(patched);
            }
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
        const { name, category, sku, name1c, code, description, price, priceByDk, unit, sortOrder } = body;

        if (!name || !category) {
            return NextResponse.json({ error: 'name and category are required' }, { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                name,
                category,
                sku: sku || undefined,
                name1c: name1c || undefined,
                code: code || undefined,
                description: description || undefined,
                price: Number(price) || 0,
                priceByDk: priceByDk || undefined,
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
