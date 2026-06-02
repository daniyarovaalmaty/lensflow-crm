import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();
    if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const orgId = session.user.organizationId;
    
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, type: true, crmPhone: true }
    });

    if (!org) {
        return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
    }

    const branches = await prisma.organization.findMany({
        where: {
            parentId: orgId,
            type: 'branch',
            status: 'active',
        },
        select: {
            id: true,
            name: true,
            address: true,
            city: true,
            crmPhone: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
        org,
        branches,
    });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const orgId = session.user.organizationId;
    const body = await request.json();
    const { targetOrgId, crmPhone } = body;

    if (!targetOrgId) {
        return NextResponse.json({ error: 'targetOrgId обязателен' }, { status: 400 });
    }

    const targetOrg = await prisma.organization.findFirst({
        where: {
            id: targetOrgId,
            OR: [
                { id: orgId },
                { parentId: orgId }
            ]
        }
    });

    if (!targetOrg) {
        return NextResponse.json({ error: 'Организация не найдена или нет доступа' }, { status: 404 });
    }

    const updated = await prisma.organization.update({
        where: { id: targetOrgId },
        data: { crmPhone: crmPhone?.trim() || null },
    });

    return NextResponse.json(updated);
}
