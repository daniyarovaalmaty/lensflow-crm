import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { translateCyrillicToEnglishLayout } from '@/lib/utils/keyboard-layout';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q') || '';
        const translated = translateCyrillicToEnglishLayout(query);
        const queries = [query];
        if (translated !== query) queries.push(translated);

        const products = await prisma.opticProduct.findMany({
            where: {
                organizationId: session.user.organizationId,
                OR: queries.flatMap(q => [
                    { name: { contains: q, mode: 'insensitive' as const } },
                    { sku: { contains: q, mode: 'insensitive' as const } },
                    { barcode: { contains: q, mode: 'insensitive' as const } },
                    { stockItems: { some: { barcode: { contains: q, mode: 'insensitive' as const } } } },
                ])
            },
            take: 10,
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ products });
    } catch (error) {
        console.error('Error searching products:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
