import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/types/user';
import { findUserByEmail, verifyPassword, findUserWithOrg, createUser } from '@/lib/db/users';
import { verifyViaMedMundus } from '@/lib/medmundus-bridge';
import prisma from '@/lib/db/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                // Validate input
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
    callbacks: {
        async authorized({ request, auth: session }) {
            const { pathname } = request.nextUrl;
            // Protect all private routes — redirect to login if no session
            if (
                pathname.startsWith('/optic') ||
                pathname.startsWith('/laboratory') ||
                pathname.startsWith('/profile')
            ) {
                if (!session) return false; // redirects to pages.signIn
            }

            // Redirect lab_accountant from production to accountant page
            if (pathname === '/laboratory/production' && session?.user?.subRole === 'lab_accountant') {
                return Response.redirect(new URL('/laboratory/accountant', request.url));
            }

            return true;
        },
        async jwt({ token, user }) {
            // On sign in, add user data to token
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.role = user.role;
                token.subRole = user.subRole;
                token.organizationId = user.organizationId;
                token.profile = user.profile;
            }
            return token;
        },
        async session({ session, token }) {
            // Add custom fields to session
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "doctor" | "optic" | "laboratory";
                session.user.subRole = token.subRole as any;
                session.user.organizationId = token.organizationId as string | undefined;
                session.user.profile = token.profile as any;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    trustHost: true,
});
