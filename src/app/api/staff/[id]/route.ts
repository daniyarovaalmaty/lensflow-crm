export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

/**
 * PATCH /api/staff/[id] — update user password
 * Only lab_head and lab_admin can access
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const sub = session.user.subRole;
        if (sub !== 'lab_head' && sub !== 'lab_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { password } = body;

        if (!password || password.length < 4) {
            return NextResponse.json({ error: 'Пароль должен быть минимум 4 символа' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: params.id } });
        if (!user || user.role !== 'laboratory') {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: params.id },
            data: { password: hashedPassword },
        });

        return NextResponse.json({ success: true, message: 'Пароль обновлён' });
    } catch (error) {
        console.error('PATCH /api/staff/[id] error:', error);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }
}

/**
 * DELETE /api/staff/[id] — delete a laboratory user
 * Only lab_head and lab_admin can access
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const sub = session.user.subRole;
        if (sub !== 'lab_head' && sub !== 'lab_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Prevent self-deletion
        if (session.user.id === params.id) {
            return NextResponse.json({ error: 'Нельзя удалить самого себя' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: params.id } });
        if (!user || user.role !== 'laboratory') {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        await prisma.user.delete({ where: { id: params.id } });

        return NextResponse.json({ success: true, message: 'Сотрудник удалён' });
    } catch (error) {
        console.error('DELETE /api/staff/[id] error:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
