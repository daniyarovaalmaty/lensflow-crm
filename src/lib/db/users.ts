import bcrypt from 'bcryptjs';
import type { User, PublicUser } from '@/types/user';

// Mock in-memory user database
// In production, this should be replaced with a real database (PostgreSQL/Supabase)
let users: User[] = [];

/**
 * Seed demo users for testing — one per sub-role
 */
export function seedDemoUsers() {
    const demoUsers: Omit<User, 'id' | 'createdAt'>[] = [
        // ==================== Laboratory ====================
        {
            email: 'engineer@lensflow.ru',
            password: bcrypt.hashSync('password123', 10),
            role: 'laboratory',
            subRole: 'lab_engineer',
            profile: {
                fullName: 'Инженер Петров Алексей',
                phone: '+77001001001',
                labName: 'Производственная лаборатория №1',
            },
        },
        {
            email: 'quality@lensflow.ru',
            password: bcrypt.hashSync('password123', 10),
            role: 'laboratory',
            subRole: 'lab_quality',
            profile: {
                fullName: 'Контролёр Сидорова Анна',
                phone: '+77001001002',
                labName: 'Производственная лаборатория №1',
            },
        },
        {
            email: 'lab@lensflow.ru',
            password: bcrypt.hashSync('password123', 10),
            role: 'laboratory',
            subRole: 'lab_admin',
            profile: {
                fullName: 'Админ Козлов Дмитрий',
                phone: '+77001001003',
                labName: 'Производственная лаборатория №1',
            },
        },
        {
            email: 'lab-buh@lensflow.ru',
            password: bcrypt.hashSync('password123', 10),
            role: 'laboratory',
            subRole: 'lab_accountant',
            profile: {
                fullName: 'Бухгалтер Иванова Мария',
                phone: '+77001001004',
                labName: 'Производственная лаборатория №1',
            },
        },
        {
            email: 'logistics@lensflow.ru',
            password: bcrypt.hashSync('password123', 10),
            role: 'laboratory',
            subRole: 'lab_logistics',
            profile: {
                fullName: 'Логист Курьеров Тимур',
                phone: '+77001001005',
                labName: 'Производственная лаборатория №1',
            },
        },
        {
            email: 'head@lensflow.ru',
            password: bcrypt.hashSync('password123', 10),
            role: 'laboratory',
            subRole: 'lab_head',
            profile: {
                fullName: 'Руководитель Нургазиев Бахыт',
                phone: '+77001001006',
                labName: 'Производственная лаборатория №1',
            },
        },
        // ==================== Clinic (Optic) ====================
        {
            email: 'optic@lensflow.ru',
            password: bcrypt.hashSync('password123', 10),
            role: 'optic',
            subRole: 'optic_manager',
            profile: {
                fullName: 'Руководитель Оптика Плюс',
                phone: '+77009876543',
                opticName: 'Оптика на Невском',
            },
        },
        {
            email: 'optic-doc@lensflow.ru',
            password: bcrypt.hashSync('password123', 10),
            role: 'optic',
            subRole: 'optic_doctor',
            profile: {
                fullName: 'Доктор Иванов И.И.',
                phone: '+77009876544',
                opticName: 'Оптика на Невском',
                clinic: 'Клиника "Зоркий Глаз"',
            },
        },
        {
            email: 'optic-buh@lensflow.ru',
            password: bcrypt.hashSync('password123', 10),
            role: 'optic',
            subRole: 'optic_accountant',
            profile: {
                fullName: 'Бухгалтер Смирнова Елена',
                phone: '+77009876545',
                opticName: 'Оптика на Невском',
            },
        },
        // ==================== Independent Doctor ====================
        {
            email: 'doctor@lensflow.ru',
            password: bcrypt.hashSync('password123', 10),
            role: 'doctor',
            subRole: 'doctor',
            profile: {
                fullName: 'Доктор Сидоров А.П.',
                phone: '+77001234567',
                clinic: 'Частная практика',
            },
        },

        // ==================== PRODUCTION: Лаборатория MedInvision ====================
        {
            email: 'engineer@medinvision.kz',
            password: bcrypt.hashSync('MedInvision2026!', 10),
            role: 'laboratory',
            subRole: 'lab_engineer',
            profile: {
                fullName: '',
                phone: '',
                labName: 'MedInvision',
            },
        },
        {
            email: 'quality@medinvision.kz',
            password: bcrypt.hashSync('MedInvision2026!', 10),
            role: 'laboratory',
            subRole: 'lab_quality',
            profile: {
                fullName: '',
                phone: '',
                labName: 'MedInvision',
            },
        },
        {
            email: 'logistics@medinvision.kz',
            password: bcrypt.hashSync('MedInvision2026!', 10),
            role: 'laboratory',
            subRole: 'lab_logistics',
            profile: {
                fullName: '',
                phone: '',
                labName: 'MedInvision',
            },
        },
        {
            email: 'head@medinvision.kz',
            password: bcrypt.hashSync('MedInvision2026!', 10),
            role: 'laboratory',
            subRole: 'lab_head',
            profile: {
                fullName: '',
                phone: '',
                labName: 'MedInvision',
            },
        },
        {
            email: 'admin@medinvision.kz',
            password: bcrypt.hashSync('MedInvision2026!', 10),
            role: 'laboratory',
            subRole: 'lab_admin',
            profile: {
                fullName: '',
                phone: '',
                labName: 'MedInvision',
            },
        },
        {
            email: 'accountant@medinvision.kz',
            password: bcrypt.hashSync('MedInvision2026!', 10),
            role: 'laboratory',
            subRole: 'lab_accountant',
            profile: {
                fullName: '',
                phone: '',
                labName: 'MedInvision',
            },
        },

        // ==================== PRODUCTION: Врач ЦКК ====================
        {
            email: 'Azamat.ivdh@gmail.com',
            password: bcrypt.hashSync('CKK2026!', 10),
            role: 'doctor',
            subRole: 'doctor',
            profile: {
                fullName: '',
                phone: '',
                clinic: 'ЦКК',
            },
        },

        // ==================== PRODUCTION: Оптика New Eye ====================
        {
            email: 'manager@neweye.kz',
            password: bcrypt.hashSync('NewEye2026!', 10),
            role: 'optic',
            subRole: 'optic_manager',
            profile: {
                fullName: '',
                phone: '',
                opticName: 'New Eye',
            },
        },
        {
            email: 'doctor@neweye.kz',
            password: bcrypt.hashSync('NewEye2026!', 10),
            role: 'optic',
            subRole: 'optic_doctor',
            profile: {
                fullName: '',
                phone: '',
                opticName: 'New Eye',
                clinic: 'New Eye',
            },
        },
        {
            email: 'accountant@neweye.kz',
            password: bcrypt.hashSync('NewEye2026!', 10),
            role: 'optic',
            subRole: 'optic_accountant',
            profile: {
                fullName: '',
                phone: '',
                opticName: 'New Eye',
            },
        },
    ];

    users = demoUsers.map((user, index) => ({
        ...user,
        id: `user-${index + 1}`,
        createdAt: new Date().toISOString(),
    }));

    console.log('✅ Demo users seeded:', users.length);
}

// Seed demo users on module load
seedDemoUsers();

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
    return users.find((u) => u.email === email) || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
    return users.find((u) => u.id === id) || null;
}

/**
 * Create a new user
 */
export async function createUser(
    userData: Omit<User, 'id' | 'createdAt'>
): Promise<User> {
    const newUser: User = {
        ...userData,
        id: `user-${users.length + 1}`,
        createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    return newUser;
}

/**
 * Verify user password
 */
export async function verifyPassword(
    user: User,
    password: string
): Promise<boolean> {
    return bcrypt.compare(password, user.password);
}

/**
 * Get public user data (without password)
 */
export function toPublicUser(user: User): PublicUser {
    const { password, ...publicUser } = user;
    return publicUser;
}

/**
 * Get all users (for admin purposes)
 */
export async function getAllUsers(): Promise<PublicUser[]> {
    return users.map(toPublicUser);
}
