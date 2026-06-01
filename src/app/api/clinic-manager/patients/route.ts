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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const skip = (page - 1) * limit;
    const source = searchParams.get('source') || 'all';

    const where: any = { organizationId: orgId };
    if (source === 'itigris') where.externalSource = 'itigris';
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
        ];
    }

    const [patients, total] = await Promise.all([
        (prisma as any).patient.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                birthDate: true,
                gender: true,
                externalId: true,
                externalSource: true,
                createdAt: true,
                _count: { select: { orders: true } },
            },
        }),
        (prisma as any).patient.count({ where }),
    ]);

    return NextResponse.json({ patients, total, page, pages: Math.ceil(total / limit) });
}
