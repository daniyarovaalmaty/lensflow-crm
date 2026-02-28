export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { RegisterUserSchema } from '@/types/user';
import { findUserByEmail, toPublicUser } from '@/lib/db/users';
import prisma from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

/**
 * POST /api/users - Register a new user
 * Only clinic (optic) and doctor registration is allowed.
 * Laboratory users are created by seed/admin only.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validate input
        const parsed = RegisterUserSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Неверные данные', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { email, password, role, subRole, profile } = parsed.data;

        // Block laboratory registration via API
        if (role === 'laboratory') {
            return NextResponse.json(
                { error: 'Регистрация лаборатории доступна только администратору' },
                { status: 403 }
            );
        }

        // Check if user already exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return NextResponse.json(
                { error: 'Пользователь с таким email уже существует' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        let organizationId: string | undefined;

        // For optic (clinic) registration — create organization
        if (role === 'optic' && profile.opticName) {
            const org = await prisma.organization.create({
                data: {
                    name: profile.opticName,
                    status: 'active',
                },
            });
            organizationId = org.id;
        }

        // Create user
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName: profile.fullName,
                phone: profile.phone || undefined,
                role,
                subRole: subRole as any,
                status: 'active',
                organizationId,
            },
        });

        return NextResponse.json(
            {
                message: 'Пользователь успешно зарегистрирован',
                user: toPublicUser(newUser),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Ошибка сервера при регистрации' },
            { status: 500 }
        );
    }
}
