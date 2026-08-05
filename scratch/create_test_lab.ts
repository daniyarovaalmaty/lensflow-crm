import { config } from 'dotenv';
config({ path: '.env' });
import prisma from '../src/lib/db/prisma';
import bcrypt from 'bcryptjs';

async function main() {
    console.log('Создание тестовой лаборатории...');
    const testLab = await prisma.organization.create({
        data: {
            name: 'Тестовая Лаборатория (Для 1С)',
            type: 'laboratory',
            inn: '000000000000',
            metadata: {
                onec: {
                    baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v/odata/standard.odata/',
                    username: 'your_1c_username', // нужно будет заменить в настройках
                    password: 'your_1c_password'  // нужно будет заменить в настройках
                }
            }
        }
    });
    console.log('✅ Лаборатория создана, ID:', testLab.id);

    console.log('Создание тестового пользователя...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = await prisma.user.create({
        data: {
            email: 'test_lab@lensflow.kz',
            password: hashedPassword,
            fullName: 'Тестовый Админ',
            role: 'laboratory',
            subRole: 'lab_admin',
            organizationId: testLab.id,
        }
    });
    console.log('✅ Пользователь создан:', testUser.email);

    console.log('Создание фейковой клиники для тестов...');
    const testClinic = await prisma.organization.create({
        data: {
            name: 'Фейковая Тестовая Клиника',
            type: 'standalone',
            inn: '123456789012',
            discountPercent: 0,
        }
    });
    console.log('✅ Клиника создана, ID:', testClinic.id);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
