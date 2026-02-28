export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

/**
 * GET /api/staff — list all laboratory users
 * Only lab_head and lab_admin can access
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const sub = session.user.subRole;
        if (sub !== 'lab_head' && sub !== 'lab_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            where: { role: 'laboratory' },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                subRole: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('GET /api/staff error:', error);
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
}

/**
 * POST /api/staff — create a new laboratory user
 * Only lab_head and lab_admin can create
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const sub = session.user.subRole;
        if (sub !== 'lab_head' && sub !== 'lab_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { email, password, fullName, phone, subRole } = body;

        if (!email || !password || !fullName || !subRole) {
            return NextResponse.json({ error: 'email, password, fullName, subRole are required' }, { status: 400 });
        }

        // Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                phone: phone || undefined,
                role: 'laboratory',
                subRole: subRole as any,
                status: 'active',
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                subRole: true,
                status: true,
                createdAt: true,
            },
        });

        return NextResponse.json(newUser, { status: 201 });
    } catch (error) {
        console.error('POST /api/staff error:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
