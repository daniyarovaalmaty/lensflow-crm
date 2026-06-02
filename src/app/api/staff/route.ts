export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

const LAB_ADMIN_SUBROLES = ['lab_head', 'lab_admin'];
const DIST_ADMIN_SUBROLES = ['dist_head', 'dist_admin'];

/**
 * GET /api/staff — list lab or distributor users
 * Lab: lab_head/lab_admin can list lab users
 * Distributor: dist_head/dist_admin can list their org users
 */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });

        const sub = (session.user as any).subRole;
        const role = (session.user as any).role;

        if (role === 'laboratory' && LAB_ADMIN_SUBROLES.includes(sub)) {
            const users = await prisma.user.findMany({
                where: { role: 'laboratory' },
                select: { id: true, email: true, fullName: true, phone: true, subRole: true, status: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            });
            return NextResponse.json(users);
        }

        if (role === 'distributor' && DIST_ADMIN_SUBROLES.includes(sub)) {
            const orgId = (session.user as any).organizationId;
            const users = await prisma.user.findMany({
                where: { role: 'distributor', organizationId: orgId },
                select: { id: true, email: true, fullName: true, phone: true, subRole: true, status: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            });
            return NextResponse.json(users);
        }

        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } catch (error) {
        console.error('GET /api/staff error:', error);
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
}

/**
 * POST /api/staff — create a new lab or distributor user
 */
export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { email, password, fullName, phone, subRole } = body;

        if (!email || !password || !fullName || !subRole) {
            return NextResponse.json({ error: 'email, password, fullName, subRole обязательны' }, { status: 400 });
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
                role: isLabAdmin ? 'laboratory' : 'distributor',
                subRole: subRole as any,
                status: 'active',
                // Distributor staff inherit organization
                organizationId: isDistAdmin ? (session.user as any).organizationId : undefined,
            },
            select: { id: true, email: true, fullName: true, phone: true, subRole: true, status: true, createdAt: true },
        });

        return NextResponse.json(newUser, { status: 201 });
    } catch (error) {
        console.error('POST /api/staff error:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
