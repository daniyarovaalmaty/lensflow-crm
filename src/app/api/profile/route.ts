import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// GET /api/profile — get current user profile
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatar: true,
            role: true,
            subRole: true,
            organization: { select: { name: true } },
        },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
}

// PUT /api/profile — update current user profile
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fullName, phone, avatar } = body;

    const updateData: any = {};
    if (typeof fullName === 'string') updateData.fullName = fullName.trim();
    if (typeof phone === 'string') updateData.phone = phone.trim() || null;
    if (typeof avatar === 'string' || avatar === null) updateData.avatar = avatar;

    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatar: true,
            role: true,
            subRole: true,
        },
    });

    return NextResponse.json(user);
}
