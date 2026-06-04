import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// PATCH /api/user/profile — update name and phone
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone } = await req.json();

    const updateData: any = {};
    if (typeof name === 'string' && name.trim()) {
        updateData.fullName = name.trim();
    }
    if (typeof phone === 'string') {
        updateData.phone = phone.trim() || null;
    }

    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: { id: true, fullName: true, phone: true, email: true },
    });

    return NextResponse.json(user);
}

// GET /api/user/profile — get current user basic info
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, fullName: true, email: true, phone: true, subRole: true },
    });

    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(user);
}
