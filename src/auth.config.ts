import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    providers: [], // Add providers in auth.ts
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
} satisfies NextAuthConfig;
