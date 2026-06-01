import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = (session.user as any).organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const source = searchParams.get('source') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: orgId };
    if (source === 'itigris') where.source = 'itigris';
    if (status !== 'all') where.status = status;
    if (search) {
        where.OR = [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { patient: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    const [orders, total] = await Promise.all([
        (prisma as any).order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                patient: { select: { id: true, name: true, phone: true } },
            },
        }),
        (prisma as any).order.count({ where }),
    ]);

    return NextResponse.json({ orders, total, page, pages: Math.ceil(total / limit) });
}
