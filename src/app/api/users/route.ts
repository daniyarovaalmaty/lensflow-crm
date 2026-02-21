export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { RegisterUserSchema } from '@/types/user';
import { createUser, findUserByEmail, toPublicUser } from '@/lib/db/users';

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

        // Create user
        const newUser = await createUser({
            email,
            password: hashedPassword,
            role,
            subRole,
            profile,
        });

        // Return public user data
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
