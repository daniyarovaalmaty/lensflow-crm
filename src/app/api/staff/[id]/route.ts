export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

const LAB_ADMIN_SUBROLES = ['lab_head', 'lab_admin'];
const DIST_ADMIN_SUBROLES = ['dist_head', 'dist_admin'];

/**
 * PATCH /api/staff/[id] update user password or profile
 * lab_head/lab_admin for laboratory, dist_head/dist_admin for distributor
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const sub = (session.user as any).subRole;
        const role = (session.user as any).role;
        
        const isLabAdmin = role === 'laboratory' && LAB_ADMIN_SUBROLES.includes(sub);
        const isDistAdmin = role === 'distributor' && DIST_ADMIN_SUBROLES.includes(sub);

        if (!isLabAdmin && !isDistAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const user = await prisma.user.findUnique({ where: { id: params.id } });
        if (!user || (isLabAdmin && user.role !== 'laboratory') || (isDistAdmin && user.role !== 'distributor')) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { password, fullName, phone, subRole, permissions } = body;

        const data: any = {};

        // Password update
        if (password) {
            if (password.length < 4) {
                return NextResponse.json({ error: 'Пароль должен быть минимум 4 символа' }, { status: 400 });
            }
            data.password = await bcrypt.hash(password, 10);
        }

        // Profile fields
        if (fullName !== undefined) data.fullName = fullName;
        if (phone !== undefined) data.phone = phone || null;
        if (subRole !== undefined) data.subRole = subRole;
        if (permissions !== undefined) data.permissions = permissions;

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: 'Нечего обновлять' }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: params.id },
            data,
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                subRole: true,
                status: true,
                permissions: true,
                createdAt: true,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('PATCH /api/staff/[id] error:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
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
