import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/types/user';
import { findUserByEmail, verifyPassword, findUserWithOrg } from '@/lib/db/users';

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

                // Find user
                const user = await findUserByEmail(email);
                if (!user) {
                    return null;
                }

                // Check user status
                if (user.status !== 'active') {
                    return null;
                }

                // Verify password
                const isValidPassword = await verifyPassword(user, password);
                if (!isValidPassword) {
                    return null;
                }

                // Load org info
                const userWithOrg = await findUserWithOrg(user.id);
                const orgName = userWithOrg?.organization?.name;

                // Return user data for JWT
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
