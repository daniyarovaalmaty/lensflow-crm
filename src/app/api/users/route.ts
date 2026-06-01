export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { RegisterUserSchema } from '@/types/user';
import { findUserByEmail, toPublicUser } from '@/lib/db/users';
import prisma from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

/**
 * POST /api/users - Register a new user
 * Allowed: optic, doctor, distributor
 * Blocked: laboratory (admin-only via DB)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

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

        // Block non-manager optic registration
        if (role === 'optic' && subRole !== 'optic_manager') {
            return NextResponse.json(
                { error: 'Регистрация доступна только руководителю клиники. Врачей и бухгалтеров добавляет руководитель.' },
                { status: 403 }
            );
        }

        // Block non-head distributor self-registration
        if (role === 'distributor' && subRole !== 'dist_head') {
            return NextResponse.json(
                { error: 'Регистрация доступна только руководителю дистрибьютора.' },
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

        const hashedPassword = await bcrypt.hash(password, 10);

        let organizationId: string | undefined;

        // For optic — create organization immediately active
        if (role === 'optic' && profile.opticName) {
            const org = await prisma.organization.create({
                data: { name: profile.opticName, type: 'standalone', status: 'active' },
            });
            organizationId = org.id;
        }

        // For distributor — create organization pending approval
        if (role === 'distributor' && profile.opticName) {
            const org = await prisma.organization.create({
                data: { name: profile.opticName, type: 'distributor', status: 'pending' },
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
                status: role === 'distributor' ? 'pending' : 'active',
                organizationId,
            },
        });

        return NextResponse.json(
            {
                message: role === 'distributor'
                    ? 'Заявка принята. После проверки вы получите доступ к системе.'
                    : 'Пользователь успешно зарегистрирован',
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
