import { z } from 'zod';

// ==================== User Roles (top-level groups) ====================
export const UserRoleEnum = z.enum(['doctor', 'optic', 'laboratory']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const UserRoleLabels: Record<UserRole, string> = {
    doctor: 'Врач',
    optic: 'Клиника',
    laboratory: 'Лаборатория',
};

// ==================== Sub-Roles ====================
export const SubRoleEnum = z.enum([
    // Laboratory sub-roles
    'lab_engineer',     // Инженер
    'lab_quality',      // Контроль качества
    'lab_logistics',    // Логист
    'lab_admin',        // Администратор
    'lab_accountant',   // Бухгалтер

    // Optic (Clinic) sub-roles
    'optic_manager',    // Руководитель
    'optic_doctor',     // Врач клиники
    'optic_accountant', // Бухгалтер клиники

    // Doctor (independent)
    'doctor',           // Независимый врач
]);
export type SubRole = z.infer<typeof SubRoleEnum>;

export const SubRoleLabels: Record<SubRole, string> = {
    lab_engineer: 'Инженер',
    lab_quality: 'Контроль качества',
    lab_logistics: 'Логист',
    lab_admin: 'Администратор',
    lab_accountant: 'Бухгалтер',
    optic_manager: 'Руководитель',
    optic_doctor: 'Врач',
    optic_accountant: 'Бухгалтер',
    doctor: 'Врач',
};

// Which sub-roles belong to which top-level role
export const SubRolesByRole: Record<UserRole, SubRole[]> = {
    laboratory: ['lab_engineer', 'lab_quality', 'lab_logistics', 'lab_admin', 'lab_accountant'],
    optic: ['optic_manager', 'optic_doctor', 'optic_accountant'],
    doctor: ['doctor'],
};

// Reverse: get top-level role from sub-role
export function getRoleFromSubRole(subRole: SubRole): UserRole {
    if (subRole.startsWith('lab_')) return 'laboratory';
    if (subRole.startsWith('optic_')) return 'optic';
    return 'doctor';
}

// ==================== Permissions ====================
export interface PermissionSet {
    canViewKanban: boolean;
    canChangeStatus: boolean;  // generic: take to in_production / back from rework
    canMarkReady: boolean;     // engineer: in_production → ready
    canMarkRework: boolean;    // quality: ready → rework
    canDeliver: boolean;       // logistics: shipped → out_for_delivery
    canAddDefects: boolean;
    canViewPayments: boolean;
    canChangePayments: boolean;
    canShip: boolean;
    canPrint: boolean;
    canCreateOrders: boolean;
    canViewOrders: boolean;
    canViewAllOrders: boolean;
    canViewStats: boolean;
}

export const PermissionsBySubRole: Record<SubRole, PermissionSet> = {
    lab_engineer: {
        canViewKanban: true,
        canChangeStatus: true,
        canMarkReady: true,
        canMarkRework: false,
        canDeliver: false,
        canAddDefects: true,
        canViewPayments: false,
        canChangePayments: false,
        canShip: false,
        canPrint: true,
        canCreateOrders: false,
        canViewOrders: true,
        canViewAllOrders: true,
        canViewStats: false,
    },
    lab_quality: {
        canViewKanban: true,
        canChangeStatus: true,
        canMarkReady: false,
        canMarkRework: true,
        canDeliver: false,
        canAddDefects: true,
        canViewPayments: false,
        canChangePayments: false,
        canShip: true,
        canPrint: true,
        canCreateOrders: false,
        canViewOrders: true,
        canViewAllOrders: true,
        canViewStats: false,
    },
    lab_logistics: {
        canViewKanban: true,
        canChangeStatus: false,
        canMarkReady: false,
        canMarkRework: false,
        canDeliver: true,        // shipped → out_for_delivery
        canAddDefects: false,
        canViewPayments: false,
        canChangePayments: false,
        canShip: false,
        canPrint: true,
        canCreateOrders: false,
        canViewOrders: true,
        canViewAllOrders: true,
        canViewStats: false,
    },
    lab_admin: {
        canViewKanban: true,
        canChangeStatus: true,
        canMarkReady: true,
        canMarkRework: true,
        canDeliver: true,
        canAddDefects: true,
        canViewPayments: true,
        canChangePayments: true,
        canShip: true,
        canPrint: true,
        canCreateOrders: false,
        canViewOrders: true,
        canViewAllOrders: true,
        canViewStats: true,
    },
    lab_accountant: {
        canViewKanban: false,
        canChangeStatus: false,
        canMarkReady: false,
        canMarkRework: false,
        canDeliver: false,
        canAddDefects: false,
        canViewPayments: true,
        canChangePayments: false,
        canShip: false,
        canPrint: false,
        canCreateOrders: false,
        canViewOrders: false,
        canViewAllOrders: false,
        canViewStats: false,
    },
    optic_manager: {
        canViewKanban: false,
        canChangeStatus: false,
        canMarkReady: false,
        canMarkRework: false,
        canDeliver: false,
        canAddDefects: false,
        canViewPayments: true,
        canChangePayments: false,
        canShip: false,
        canPrint: true,
        canCreateOrders: true,
        canViewOrders: true,
        canViewAllOrders: true,
        canViewStats: true,
    },
    optic_doctor: {
        canViewKanban: false,
        canChangeStatus: false,
        canMarkReady: false,
        canMarkRework: false,
        canDeliver: false,
        canAddDefects: false,
        canViewPayments: false,
        canChangePayments: false,
        canShip: false,
        canPrint: true,
        canCreateOrders: true,
        canViewOrders: true,
        canViewAllOrders: false,
        canViewStats: false,
    },
    optic_accountant: {
        canViewKanban: false,
        canChangeStatus: false,
        canMarkReady: false,
        canMarkRework: false,
        canDeliver: false,
        canAddDefects: false,
        canViewPayments: true,
        canChangePayments: false,
        canShip: false,
        canPrint: true,
        canCreateOrders: false,
        canViewOrders: false,
        canViewAllOrders: false,
        canViewStats: false,
    },
    doctor: {
        canViewKanban: false,
        canChangeStatus: false,
        canMarkReady: false,
        canMarkRework: false,
        canDeliver: false,
        canAddDefects: false,
        canViewPayments: false,
        canChangePayments: false,
        canShip: false,
        canPrint: true,
        canCreateOrders: true,
        canViewOrders: true,
        canViewAllOrders: false,
        canViewStats: false,
    },
};

// Helper to get permissions for a sub-role
export function getPermissions(subRole: SubRole): PermissionSet {
    return PermissionsBySubRole[subRole];
}

// ==================== User Profile ====================
export const UserProfileSchema = z.object({
    fullName: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
    phone: z.string().regex(/^\+?[\d\s\-()]{10,20}$/, 'Неверный формат телефона').optional(),
    clinic: z.string().optional(), // для врачей
    opticName: z.string().optional(), // для оптик
    labName: z.string().optional(), // для лаборатории
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// ==================== User ====================
export const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    password: z.string(), // hashed
    role: UserRoleEnum,
    subRole: SubRoleEnum,
    profile: UserProfileSchema,
    createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
export type PublicUser = Omit<User, 'password'>;

// ==================== Auth ====================
export const LoginSchema = z.object({
    email: z.string().email('Неверный формат email'),
    password: z.string().min(1, 'Введите пароль'),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

export const RegisterUserSchema = z.object({
    email: z.string().email('Неверный email'),
    password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
    confirmPassword: z.string(),
    role: UserRoleEnum,
    subRole: SubRoleEnum,
    profile: UserProfileSchema,
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
});

export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>;
