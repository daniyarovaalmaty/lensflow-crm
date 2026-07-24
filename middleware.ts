import NextAuth from 'next-auth';
import { authConfig } from './src/auth.config';
const { auth } = NextAuth(authConfig);
import { NextResponse } from 'next/server';

// Public API routes that don't require authentication
const PUBLIC_API_PREFIXES = [
    '/api/auth/',           // NextAuth routes (login, callback, etc.)
    '/api/webhook/',        // Incoming webhooks (Green API, MedMundus)
    '/api/webhooks/',       // WhatsApp webhooks
    '/api/external/',       // External API (uses its own API key auth)
    '/api/cron/',           // Cron jobs (use CRON_SECRET)
    '/api/bot/',            // Bot endpoints
];

export const config = {
    matcher: [
        '/optic/:path*',
        '/laboratory/:path*',
        '/distributor/:path*',
        '/profile/:path*',
        '/api/:path*',       // Protect ALL API routes
    ],
};

// Use auth() as middleware — the `authorized` callback in auth.ts
// handles redirecting unauthenticated users to /login.
// This middleware adds extra role-based access control on top.
export default auth((request) => {
    const { pathname } = request.nextUrl;
    const session = request.auth;

    // Role-based access for optic routes
    if (pathname.startsWith('/optic')) {
        if (session && session.user.role !== 'doctor' && session.user.role !== 'optic') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }

    // Role-based access for laboratory routes
    if (pathname.startsWith('/laboratory')) {
        if (session && session.user.role !== 'laboratory') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }

    // Role-based access for distributor routes
    if (pathname.startsWith('/distributor')) {
        if (session && session.user.role !== 'distributor') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }

    // Protect API routes
    if (pathname.startsWith('/api/')) {
        // Allow public API routes (webhooks, auth, external with own auth)
        const isPublic = PUBLIC_API_PREFIXES.some(prefix => pathname.startsWith(prefix));
        if (isPublic) {
            return NextResponse.next();
        }

        // All other API routes require authentication
        if (!session) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // RBAC: laboratory API routes require laboratory role
        if (pathname.startsWith('/api/laboratory') || pathname.startsWith('/api/laboratories') || pathname.startsWith('/api/labs')) {
            if (session.user.role !== 'laboratory') {
                return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        // RBAC: distributor API routes require distributor role
        if (pathname.startsWith('/api/distributor') || pathname.startsWith('/api/distributors')) {
            if (session.user.role !== 'distributor' && session.user.role !== 'laboratory') {
                return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        // RBAC: admin routes require lab_head
        if (pathname.startsWith('/api/admin')) {
            if (session.user.subRole !== 'lab_head') {
                return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }
    }

    return NextResponse.next();
});

