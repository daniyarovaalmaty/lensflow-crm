import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// GET /api/distributors/settings — get distributor org settings (defaultLabId)
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
            id: true,
            name: true,
            defaultLabId: true,
            defaultLab: {
                select: { id: true, name: true, phone: true, email: true, city: true },
            },
        },
    });

    return NextResponse.json(org);
}

// PATCH /api/distributors/settings — update default lab
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'distributor') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json();
    const { defaultLabId } = body;

    const updated = await prisma.organization.update({
        where: { id: orgId },
        data: { defaultLabId: defaultLabId || null },
        select: {
            id: true,
            name: true,
            defaultLabId: true,
            defaultLab: {
                select: { id: true, name: true, phone: true, email: true, city: true },
            },
        },
    });

    return NextResponse.json(updated);
}
