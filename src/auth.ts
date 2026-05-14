import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/types/user';
import { findUserByEmail, verifyPassword, findUserWithOrg, createUser } from '@/lib/db/users';
import { verifyViaMedMundus } from '@/lib/medmundus-bridge';
import prisma from '@/lib/db/prisma';

function normalizePhone(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('8') && digits.length === 11) digits = '7' + digits.slice(1);
    if (digits.length === 10) digits = '7' + digits;
    return digits;
}

import { authConfig } from '@/auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                phone: { label: 'Phone', type: 'text' },
                otp_verified: { label: 'OTP Verified', type: 'text' },
            },
            async authorize(credentials) {
                const phone = (credentials?.phone as string || '').trim();
                const otpVerified = credentials?.otp_verified === 'true';

                // ======== PHONE + OTP PATH (primary) ========
                if (phone && otpVerified) {
                    const normalizedPhone = normalizePhone(phone);

                    // Check local user by exact phone match
                    let localUser = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { phone: normalizedPhone },
                                { phone: `+${normalizedPhone}` },
                            ],
                        },
                        include: { organization: true },
                    });

                    // Fallback: Search in memory for users with formatted phones (e.g. "+7 (777) 123-45-67")
                    // Self-healing: Update their phone format in the DB if found.
                    if (!localUser) {
                        const allUsers = await prisma.user.findMany({
                            where: { phone: { not: null } },
                            include: { organization: true },
                        });
                        
                        const match = allUsers.find(u => {
                            if (!u.phone) return false;
                            const dbNorm = normalizePhone(u.phone);
                            return dbNorm === normalizedPhone || `+${dbNorm}` === `+${normalizedPhone}`;
                        });

                        if (match) {
                            localUser = match;
                            // Heal the database to speed up future logins
                            await prisma.user.update({
                                where: { id: match.id },
                                data: { phone: `+${normalizedPhone}` }
                            });
                        }
                    }

                    if (localUser && localUser.status === 'active') {
                        const orgName = localUser.organization?.name;
                        return {
                            id: localUser.id,
                            email: localUser.email,
                            role: localUser.role,
                            subRole: localUser.subRole,
                            organizationId: localUser.organizationId,
                            profile: {
                                fullName: localUser.fullName,
                                phone: localUser.phone,
                                opticName: orgName,
                                labName: orgName,
                                clinic: orgName,
                            },
                        };
                    }

                    // Try MedMundus bridge — use phone as username, 'otp' as dummy password
                    // MedMundus bridge should also support OTP-verified phone lookups
                    const mmProfile = await verifyViaMedMundusPhone(normalizedPhone);
                    if (mmProfile) {
                        return await jitProvisionUser(mmProfile, 'otp-phone-login');
                    }

                    // No user found anywhere — auto-create a basic account
                    const newUser = await createUser({
                        email: `${normalizedPhone}@phone.lensflow.kz`,
                        password: `otp-${Date.now()}`, // random, won't be used
                        fullName: '',
                        phone: normalizedPhone,
                        role: 'optic' as any,
                        subRole: 'optic_doctor',
                        status: 'active',
                    });

                    return {
                        id: newUser.id,
                        email: newUser.email,
                        role: newUser.role,
                        subRole: newUser.subRole,
                        organizationId: newUser.organizationId,
                        profile: {
                            fullName: '',
                            phone: normalizedPhone,
                        },
                    };
                }

                // ======== EMAIL + PASSWORD PATH (fallback) ========
                const parsed = LoginSchema.safeParse(credentials);
                if (!parsed.success) {
                    return null;
                }

                const { email, password } = parsed.data;

                // ======== Strategy 1: Local Lens Flow user ========
                const user = await findUserByEmail(email);
                if (user && user.status === 'active') {
                    const isValidPassword = await verifyPassword(user, password);
                    if (isValidPassword) {
                        // Load org info
                        const userWithOrg = await findUserWithOrg(user.id);
                        const orgName = userWithOrg?.organization?.name;

                        return {
                            id: user.id,
                            email: user.email,
                            role: user.role,
                            subRole: user.subRole,
                            organizationId: user.organizationId,
                            profile: {
                                fullName: user.fullName,
                                phone: user.phone,
                                opticName: orgName,
                                labName: orgName,
                                clinic: orgName,
                            },
                        };
                    }
                }

                // ======== Strategy 2: MedMundus Dual Login ========
                // If local auth fails, try verifying against MedMundus API.
                // The "email" field may actually contain a phone number (MedMundus username).
                const mmProfile = await verifyViaMedMundus(email, password);
                if (!mmProfile) {
                    return null; // Neither local nor MedMundus auth succeeded
                }

                // MedMundus verified! Now JIT-provision local user if needed.
                const existingLinked = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: mmProfile.email || undefined },
                            { phone: mmProfile.phone },
                        ],
                    },
                    include: { organization: true },
                });

                if (existingLinked && existingLinked.status === 'active') {
                    // User already exists in Lens Flow — just log them in
                    const orgName = existingLinked.organization?.name;
                    return {
                        id: existingLinked.id,
                        email: existingLinked.email,
                        role: existingLinked.role,
                        subRole: existingLinked.subRole,
                        organizationId: existingLinked.organizationId,
                        profile: {
                            fullName: existingLinked.fullName,
                            phone: existingLinked.phone,
                            opticName: orgName,
                            labName: orgName,
                            clinic: orgName,
                        },
                    };
                }

                // JIT Provision: Create organization + user in Lens Flow
                let organizationId: string | undefined;

                if (mmProfile.clinic) {
                    // Check if clinic already exists in Lens Flow
                    if (mmProfile.clinic.lensflow_id) {
                        organizationId = mmProfile.clinic.lensflow_id;
                    } else {
                        // Create a new organization
                        const newOrg = await prisma.organization.create({
                            data: {
                                name: mmProfile.clinic.name,
                                phone: mmProfile.clinic.phone || null,
                                email: mmProfile.clinic.email || null,
                                city: mmProfile.clinic.city || null,
                                status: 'active',
                            },
                        });
                        organizationId = newOrg.id;
                    }
                }

                // Determine Lens Flow role mapping
                const lfRole = mmProfile.role === 'clinic' ? 'optic' : 'doctor';
                const lfSubRole = mmProfile.role === 'clinic' ? 'optic_manager' : 'optic_doctor';

                // Use email from MedMundus, fallback to phone-based email
                const userEmail = mmProfile.email || `${mmProfile.phone}@medmundus.bridge`;

                const newUser = await createUser({
                    email: userEmail,
                    password: password, // will be hashed by createUser
                    fullName: mmProfile.fullName || '',
                    phone: mmProfile.phone,
                    role: lfRole as any,
                    subRole: lfSubRole,
                    organizationId,
                    status: 'active',
                });

                const orgName = mmProfile.clinic?.name;
                return {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role,
                    subRole: newUser.subRole,
                    organizationId: newUser.organizationId,
                    profile: {
                        fullName: newUser.fullName,
                        phone: newUser.phone,
                        opticName: orgName,
                        labName: orgName,
                        clinic: orgName,
                    },
                };
            },
        }),
    ],
    
});

// ======== Helper: Verify phone exists in MedMundus (without password) ========
async function verifyViaMedMundusPhone(phone: string): Promise<any | null> {
    const apiUrl = process.env.MEDMUNDUS_API_URL;
    const bridgeKey = process.env.LENSFLOW_BRIDGE_KEY;
    if (!apiUrl || !bridgeKey) return null;

    try {
        const response = await fetch(`${apiUrl}/api/v1/account/lensflow/lookup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bridge-Key': bridgeKey,
            },
            body: JSON.stringify({ phone }),
        });

        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

// ======== Helper: JIT-provision user from MedMundus profile ========
async function jitProvisionUser(mmProfile: any, _source: string) {
    // Check if already linked
    const existingLinked = await prisma.user.findFirst({
        where: {
            OR: [
                { email: mmProfile.email || undefined },
                { phone: mmProfile.phone },
            ],
        },
        include: { organization: true },
    });

    if (existingLinked && existingLinked.status === 'active') {
        const orgName = existingLinked.organization?.name;
        return {
            id: existingLinked.id,
            email: existingLinked.email,
            role: existingLinked.role,
            subRole: existingLinked.subRole,
            organizationId: existingLinked.organizationId,
            profile: {
                fullName: existingLinked.fullName,
                phone: existingLinked.phone,
                opticName: orgName,
                labName: orgName,
                clinic: orgName,
            },
        };
    }

    // Create organization if clinic info exists
    let organizationId: string | undefined;
    if (mmProfile.clinic) {
        if (mmProfile.clinic.lensflow_id) {
            organizationId = mmProfile.clinic.lensflow_id;
        } else {
            const newOrg = await prisma.organization.create({
                data: {
                    name: mmProfile.clinic.name,
                    phone: mmProfile.clinic.phone || null,
                    email: mmProfile.clinic.email || null,
                    city: mmProfile.clinic.city || null,
                    status: 'active',
                },
            });
            organizationId = newOrg.id;
        }
    }

    const lfRole = mmProfile.role === 'clinic' ? 'optic' : 'doctor';
    const lfSubRole = mmProfile.role === 'clinic' ? 'optic_manager' : 'optic_doctor';
    const userEmail = mmProfile.email || `${mmProfile.phone}@medmundus.bridge`;

    const newUser = await createUser({
        email: userEmail,
        password: `mm-otp-${Date.now()}`,
        fullName: mmProfile.fullName || '',
        phone: mmProfile.phone,
        role: lfRole as any,
        subRole: lfSubRole,
        organizationId,
        status: 'active',
    });

    const orgName = mmProfile.clinic?.name;
    return {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        subRole: newUser.subRole,
        organizationId: newUser.organizationId,
        profile: {
            fullName: newUser.fullName,
            phone: newUser.phone,
            opticName: orgName,
            labName: orgName,
            clinic: orgName,
        },
    };
}
