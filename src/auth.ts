import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/types/user';
import { findUserByEmail, verifyPassword, toPublicUser } from '@/lib/db/users';

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

                // Verify password
                const isValidPassword = await verifyPassword(user, password);
                if (!isValidPassword) {
                    return null;
                }

                // Return public user data
                return toPublicUser(user);
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // On sign in, add user data to token
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.role = user.role;
                token.subRole = user.subRole;
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
});
