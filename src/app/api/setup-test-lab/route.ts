import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
    try {
        const testLab = await prisma.organization.create({
            data: {
                name: 'Тестовая Лаборатория (Для 1С)',
                type: 'laboratory',
                inn: '000000000000',
                metadata: {
                    onec: {
                        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v/odata/standard.odata/',
                        username: 'your_1c_username',
                        password: 'your_1c_password'
                    }
                }
            }
        });

        const hashedPassword = await bcrypt.hash('123456', 10);
        await prisma.user.create({
            data: {
                email: 'test_lab@lensflow.kz',
                password: hashedPassword,
                fullName: 'Тестовый Админ Лаборатории',
                role: 'laboratory',
                subRole: 'lab_admin',
                organizationId: testLab.id,
            }
        });

        await prisma.organization.create({
            data: {
                name: 'Тестовая Оптика',
                type: 'standalone',
                inn: '123456789012',
                discountPercent: 0,
            }
        });

        return NextResponse.json({ success: true, message: 'Тестовая среда создана!' });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
