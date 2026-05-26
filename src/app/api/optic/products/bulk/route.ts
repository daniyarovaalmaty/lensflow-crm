import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    }

    try {
        const body = await req.json();
        const { products } = body;
        
        if (!Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: 'Invalid products array' }, { status: 400 });
        }

        // Map and prepare data
        const preparedProducts = products.map((p: any) => {
            const name = p.name || 'Товар без названия';
            
            // Clean slug generation supporting Cyrillic characters
            const slug = encodeURIComponent(
                name.toLowerCase().trim().replace(/\s+/g, '-')
            ).substring(0, 100);

            const category = p.category || 'frame';
            const type = category.startsWith('service_') ? 'service' : 'product';

            return {
                organizationId: user.organizationId!,
                name,
                slug,
                category,
                type,
                brand: p.brand || null,
                model: p.model || null,
                sku: p.sku === '' ? null : (p.sku || null),
                barcode: p.barcode === '' ? null : (p.barcode || null),
                shortDescription: p.shortDescription || null,
                fullDescription: p.fullDescription || null,
                purchasePrice: Number(p.purchasePrice) || 0,
                retailPrice: Number(p.retailPrice) || 0,
                minStock: Number(p.minStock) || 0,
                unit: p.unit || 'шт',
                trackSerials: Boolean(p.trackSerials),
                isPublic: Boolean(p.isPublic),
                isActive: true,
            };
        });

        // Insert products in bulk using createMany
        const result = await prisma.opticProduct.createMany({
            data: preparedProducts,
            skipDuplicates: true, // Safe skip if SKU already exists for this clinic
        });

        return NextResponse.json({
            success: true,
            count: result.count,
            message: `Успешно импортировано ${result.count} товаров!`,
        }, { status: 201 });

    } catch (err: any) {
        console.error('Bulk import error:', err);
        return NextResponse.json({ error: err.message || 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}
