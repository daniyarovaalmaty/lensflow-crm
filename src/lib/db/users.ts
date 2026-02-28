import bcrypt from 'bcryptjs';
import prisma from './prisma';
import type { User as PrismaUser } from '@prisma/client';

// Public user type (no password)
export type PublicUser = Omit<PrismaUser, 'password'> & {
    profile: {
        fullName: string;
        phone: string | null;
        clinic?: string;
        opticName?: string;
        labName?: string;
    };
};

/**
 * Convert DB user to public user (add profile object for backward compat)
 */
export function toPublicUser(user: PrismaUser): PublicUser {
    const { password, ...rest } = user;
    return {
        ...rest,
        profile: {
            fullName: user.fullName,
            phone: user.phone,
            // Organization name is loaded separately when needed
        },
    };
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<PrismaUser | null> {
    return prisma.user.findUnique({ where: { email } });
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<PrismaUser | null> {
    return prisma.user.findUnique({ where: { id } });
}

/**
 * Find user by ID with organization info
 */
export async function findUserWithOrg(id: string) {
    return prisma.user.findUnique({
        where: { id },
        include: { organization: true },
    });
}

/**
 * Create a new user
 */
export async function createUser(userData: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: 'doctor' | 'optic' | 'laboratory';
    subRole: string;
    organizationId?: string;
    status?: 'active' | 'pending';
}): Promise<PrismaUser> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return prisma.user.create({
        data: {
            email: userData.email,
            password: hashedPassword,
            fullName: userData.fullName,
            phone: userData.phone,
            role: userData.role,
            subRole: userData.subRole as any,
            organizationId: userData.organizationId,
            status: userData.status || 'active',
        },
    });
}

/**
 * Verify user password
 */
export async function verifyPassword(
    user: PrismaUser,
    password: string
): Promise<boolean> {
    return bcrypt.compare(password, user.password);
}

/**
 * Get all users (for admin purposes)
 */
export async function getAllUsers(): Promise<PublicUser[]> {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
    });
    return users.map(toPublicUser);
}

/**
 * Get users by organization
 */
export async function getUsersByOrganization(orgId: string): Promise<PublicUser[]> {
    const users = await prisma.user.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
    });
    return users.map(toPublicUser);
}
