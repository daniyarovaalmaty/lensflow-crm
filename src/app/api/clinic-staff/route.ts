export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

/**
 * GET /api/clinic-staff — list all users in the same organization
 * Only optic_manager can access
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        if (session.user.subRole !== 'optic_manager') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const orgId = session.user.organizationId;
        if (!orgId) {
            return NextResponse.json({ error: 'No organization' }, { status: 400 });
        }

        const users = await prisma.user.findMany({
            where: { organizationId: orgId },
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
        console.error('GET /api/clinic-staff error:', error);
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
}

/**
 * POST /api/clinic-staff — create a new clinic staff member
 * Only optic_manager can create
 * Allowed sub-roles: optic_doctor, optic_accountant
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        if (session.user.subRole !== 'optic_manager') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const orgId = session.user.organizationId;
        if (!orgId) {
            return NextResponse.json({ error: 'No organization' }, { status: 400 });
        }

        const body = await request.json();
        const { email, password, fullName, phone, subRole } = body;

        if (!email || !password || !fullName || !subRole) {
            return NextResponse.json({ error: 'email, password, fullName, subRole are required' }, { status: 400 });
        }

        // Only allow adding optic_doctor or optic_accountant
        if (!['optic_doctor', 'optic_accountant'].includes(subRole)) {
            return NextResponse.json({ error: 'Можно добавить только врача или бухгалтера' }, { status: 400 });
        }

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
                role: 'optic',
                subRole: subRole as any,
                status: 'active',
                organizationId: orgId,
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
        console.error('POST /api/clinic-staff error:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
