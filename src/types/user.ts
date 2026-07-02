import { z } from 'zod';

// ==================== User Roles (top-level groups) ====================
export const UserRoleEnum = z.enum(['doctor', 'optic', 'laboratory', 'distributor']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const UserRoleLabels: Record<UserRole, string> = {
    doctor: 'Врач',
    optic: 'Клиника',
    laboratory: 'Лаборатория',
    distributor: 'Дистрибьютор',
};

// ==================== Sub-Roles ====================
export const SubRoleEnum = z.enum([
    // Laboratory sub-roles
    'lab_engineer',     // Инженер
    'lab_quality',      // Контроль качества
    'lab_logistics',    // Логист
    'lab_head',         // Руководитель
    'lab_admin',        // Администратор
    'lab_accountant',   // Бухгалтер

    // Optic (Clinic) sub-roles
    'optic_manager',    // Руководитель
    'optic_doctor',     // Врач клиники
    'optic_accountant', // Бухгалтер клиники
    'optic_procurement', // Отдел закупа

    // Doctor (independent)
    'doctor',           // Независимый врач

    // Sales CRM
    'sales_manager',    // Менеджер по продажам

    // Distributor sub-roles
    'dist_head',        // Руководитель
    'dist_admin',       // Администратор
    'dist_manager',     // Менеджер
    'dist_accountant',  // Бухгалтер
]);
export type SubRole = z.infer<typeof SubRoleEnum>;

export const SubRoleLabels: Record<SubRole, string> = {
    lab_engineer: 'Инженер',
    lab_quality: 'Контроль качества',
    lab_logistics: 'Логист',
    lab_head: 'Руководитель',
    lab_admin: 'Администратор',
    lab_accountant: 'Бухгалтер',
    optic_manager: 'Руководитель',
    optic_doctor: 'Врач',
    optic_accountant: 'Бухгалтер',
    optic_procurement: 'Отдел закупа',
    doctor: 'Врач',
    sales_manager: 'Менеджер по продажам',
    dist_head: 'Руководитель',
    dist_admin: 'Администратор',
    dist_manager: 'Менеджер',
    dist_accountant: 'Бухгалтер',
};

// Which sub-roles belong to which top-level role
export const SubRolesByRole: Record<UserRole, SubRole[]> = {
    laboratory: ['lab_engineer', 'lab_quality', 'lab_logistics', 'lab_head', 'lab_admin', 'lab_accountant', 'sales_manager'],
    optic: ['optic_manager', 'optic_doctor', 'optic_accountant', 'optic_procurement'],
    doctor: ['doctor'],
    distributor: ['dist_head', 'dist_admin', 'dist_manager', 'dist_accountant'],
};

// Reverse: get top-level role from sub-role
export function getRoleFromSubRole(subRole: SubRole): UserRole {
    if (subRole.startsWith('lab_') || subRole === 'sales_manager') return 'laboratory';
    if (subRole.startsWith('optic_')) return 'optic';
    if (subRole.startsWith('dist_')) return 'distributor';
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
    canSendToAccountant: boolean;  // admin: ready → docs_prep → accountant_review
    canProcessDocs: boolean;       // accountant: accountant_review → docs_ready
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
        canSendToAccountant: false,
        canProcessDocs: false,
    },
    lab_quality: {
        canViewKanban: true,
        canChangeStatus: false,
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
        canSendToAccountant: false,
        canProcessDocs: false,
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
        canSendToAccountant: false,
        canProcessDocs: false,
    },
    lab_head: {
        canViewKanban: true,
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
        canViewOrders: true,
        canViewAllOrders: true,
        canViewStats: true,
        canSendToAccountant: true,
        canProcessDocs: false,
    },
    lab_admin: {
        canViewKanban: true,
        canChangeStatus: false,
        canMarkReady: false,
        canMarkRework: false,
        canDeliver: true,         // shipped → out_for_delivery
        canAddDefects: true,      // архивирование браков
        canViewPayments: true,
        canChangePayments: false,
        canShip: false,
        canPrint: true,
        canCreateOrders: false,
        canViewOrders: true,
        canViewAllOrders: true,
        canViewStats: true,
        canSendToAccountant: true,
        canProcessDocs: false,
    },
    lab_accountant: {
        canViewKanban: false,
        canChangeStatus: false,
        canMarkReady: false,
        canMarkRework: false,
        canDeliver: false,
        canAddDefects: false,
        canViewPayments: true,
        canChangePayments: true,
        canShip: false,
        canPrint: false,
        canCreateOrders: false,
        canViewOrders: false,
        canViewAllOrders: false,
        canViewStats: false,
        canSendToAccountant: false,
        canProcessDocs: true,
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
        canSendToAccountant: false,
        canProcessDocs: false,
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
        canSendToAccountant: false,
        canProcessDocs: false,
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
        canSendToAccountant: false,
        canProcessDocs: false,
    },
    optic_procurement: {
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
        canSendToAccountant: false,
        canProcessDocs: false,
    },
    doctor: {
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
        canViewAllOrders: false,
        canViewStats: true,
        canSendToAccountant: false,
        canProcessDocs: false,
    },
    sales_manager: {
        canViewKanban: false,
        canChangeStatus: false,
        canMarkReady: false,
        canMarkRework: false,
        canDeliver: false,
        canAddDefects: false,
        canViewPayments: false,
        canChangePayments: false,
        canShip: false,
        canPrint: false,
        canCreateOrders: false,
        canViewOrders: false,
        canViewAllOrders: false,
        canViewStats: false,
        canSendToAccountant: false,
        canProcessDocs: false,
    },
    dist_head: {
        canViewKanban: false, canChangeStatus: false, canMarkReady: false, canMarkRework: false,
        canDeliver: false, canAddDefects: false, canViewPayments: true, canChangePayments: false,
        canShip: false, canPrint: true, canCreateOrders: true, canViewOrders: true,
        canViewAllOrders: true, canViewStats: true, canSendToAccountant: false, canProcessDocs: false,
    },
    dist_admin: {
        canViewKanban: false, canChangeStatus: false, canMarkReady: false, canMarkRework: false,
        canDeliver: false, canAddDefects: false, canViewPayments: true, canChangePayments: false,
        canShip: false, canPrint: false, canCreateOrders: false, canViewOrders: true,
        canViewAllOrders: false, canViewStats: true, canSendToAccountant: false, canProcessDocs: false,
    },
    dist_manager: {
        canViewKanban: false, canChangeStatus: false, canMarkReady: false, canMarkRework: false,
        canDeliver: false, canAddDefects: false, canViewPayments: false, canChangePayments: false,
        canShip: false, canPrint: false, canCreateOrders: false, canViewOrders: true,
        canViewAllOrders: false, canViewStats: false, canSendToAccountant: false, canProcessDocs: false,
    },
    dist_accountant: {
        canViewKanban: false, canChangeStatus: false, canMarkReady: false, canMarkRework: false,
        canDeliver: false, canAddDefects: false, canViewPayments: true, canChangePayments: false,
        canShip: false, canPrint: false, canCreateOrders: false, canViewOrders: true,
        canViewAllOrders: false, canViewStats: false, canSendToAccountant: false, canProcessDocs: true,
    },
};

// Helper to get permissions for a sub-role
export function getPermissions(subRole: SubRole): PermissionSet {
    return PermissionsBySubRole[subRole];
}

// ==================== Dynamic Clinic Module Permissions ====================
export interface ClinicPermissions {
    canViewPos: boolean;
    canViewWarehouse: boolean;
    canViewCatalog: boolean;
    canViewCash: boolean;
    canViewPatients: boolean;
    canViewFinance: boolean;
    canViewOrders: boolean;
    canViewCrm: boolean;
}

export const DefaultClinicPermissions: Record<SubRole, ClinicPermissions> = {
    optic_manager: {
        canViewPos: true,
        canViewWarehouse: true,
        canViewCatalog: true,
        canViewCash: true,
        canViewPatients: true,
        canViewFinance: true,
        canViewOrders: true,
        canViewCrm: true,
    },
    optic_doctor: {
        canViewPos: true,
        canViewWarehouse: false,
        canViewCatalog: true,
        canViewCash: true,
        canViewPatients: true,
        canViewFinance: false,
        canViewOrders: true,
        canViewCrm: false,
    },
    optic_accountant: {
        canViewPos: false,
        canViewWarehouse: true,
        canViewCatalog: true,
        canViewCash: true,
        canViewPatients: false,
        canViewFinance: true,
        canViewOrders: false,
        canViewCrm: false,
    },
    optic_procurement: {
        canViewPos: false,
        canViewWarehouse: false,
        canViewCatalog: false,
        canViewCash: false,
        canViewPatients: false,
        canViewFinance: true,
        canViewOrders: true,
        canViewCrm: false,
    },
    // Fallbacks for other roles to be fully typed and safe
    lab_engineer: { canViewPos: false, canViewWarehouse: false, canViewCatalog: false, canViewCash: false, canViewPatients: false, canViewFinance: false, canViewOrders: false, canViewCrm: false },
    lab_quality: { canViewPos: false, canViewWarehouse: false, canViewCatalog: false, canViewCash: false, canViewPatients: false, canViewFinance: false, canViewOrders: false, canViewCrm: false },
    lab_logistics: { canViewPos: false, canViewWarehouse: false, canViewCatalog: false, canViewCash: false, canViewPatients: false, canViewFinance: false, canViewOrders: false, canViewCrm: false },
    lab_head: { canViewPos: false, canViewWarehouse: false, canViewCatalog: false, canViewCash: false, canViewPatients: false, canViewFinance: false, canViewOrders: false, canViewCrm: false },
    lab_admin: { canViewPos: false, canViewWarehouse: false, canViewCatalog: false, canViewCash: false, canViewPatients: false, canViewFinance: false, canViewOrders: false, canViewCrm: false },
    lab_accountant: { canViewPos: false, canViewWarehouse: false, canViewCatalog: false, canViewCash: false, canViewPatients: false, canViewFinance: false, canViewOrders: false, canViewCrm: false },
    doctor: {
        canViewPos: true,
        canViewWarehouse: false,
        canViewCatalog: true,
        canViewCash: true,
        canViewPatients: true,
        canViewFinance: false,
        canViewOrders: true,
        canViewCrm: false,
    },
    sales_manager: { canViewPos: false, canViewWarehouse: false, canViewCatalog: false, canViewCash: false, canViewPatients: false, canViewFinance: false, canViewOrders: false, canViewCrm: true },
    dist_head: { canViewPos: true, canViewWarehouse: true, canViewCatalog: true, canViewCash: true, canViewPatients: true, canViewFinance: true, canViewOrders: true, canViewCrm: false },
    dist_admin: { canViewPos: true, canViewWarehouse: true, canViewCatalog: true, canViewCash: true, canViewPatients: true, canViewFinance: true, canViewOrders: true, canViewCrm: false },
    dist_manager: { canViewPos: true, canViewWarehouse: true, canViewCatalog: true, canViewCash: true, canViewPatients: true, canViewFinance: false, canViewOrders: true, canViewCrm: false },
    dist_accountant: { canViewPos: false, canViewWarehouse: false, canViewCatalog: true, canViewCash: false, canViewPatients: false, canViewFinance: true, canViewOrders: true, canViewCrm: false },
};

export function getEffectiveClinicPermissions(user: { subRole: string; permissions?: any }): ClinicPermissions {
    const roleDefault = DefaultClinicPermissions[user.subRole as SubRole] || {
        canViewPos: false,
        canViewWarehouse: false,
        canViewCatalog: false,
        canViewCash: false,
        canViewPatients: false,
        canViewFinance: false,
        canViewOrders: false,
        canViewCrm: false,
    };

    if (!user.permissions || typeof user.permissions !== 'object') {
        return roleDefault;
    }

    const p = user.permissions;
    return {
        canViewPos: typeof p.canViewPos === 'boolean' ? p.canViewPos : roleDefault.canViewPos,
        canViewWarehouse: typeof p.canViewWarehouse === 'boolean' ? p.canViewWarehouse : roleDefault.canViewWarehouse,
        canViewCatalog: typeof p.canViewCatalog === 'boolean' ? p.canViewCatalog : roleDefault.canViewCatalog,
        canViewCash: typeof p.canViewCash === 'boolean' ? p.canViewCash : roleDefault.canViewCash,
        canViewPatients: typeof p.canViewPatients === 'boolean' ? p.canViewPatients : roleDefault.canViewPatients,
        canViewFinance: typeof p.canViewFinance === 'boolean' ? p.canViewFinance : roleDefault.canViewFinance,
        canViewOrders: typeof p.canViewOrders === 'boolean' ? p.canViewOrders : roleDefault.canViewOrders,
        canViewCrm: typeof p.canViewCrm === 'boolean' ? p.canViewCrm : roleDefault.canViewCrm,
    };
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
