import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export const config = {
    matcher: [
        '/optic/:path*',
        '/laboratory/:path*',
        '/profile/:path*',
        '/api/orders/:path*',
        '/api/profile/:path*',
        '/api/catalog/:path*',
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

    // Protect API routes (extra check — auth callback already handles pages)
    if (pathname.startsWith('/api/orders') || pathname.startsWith('/api/profile') || pathname.startsWith('/api/catalog')) {
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    return NextResponse.next();
});
