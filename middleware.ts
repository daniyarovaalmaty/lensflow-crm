import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

// Role-based access control middleware
export default async function middleware(request: NextRequest) {
    const session = await auth();
    const { pathname } = request.nextUrl;

    // Protect optic routes (doctors and optics only)
    if (pathname.startsWith('/optic')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        if (session.user.role !== 'doctor' && session.user.role !== 'optic') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }

    // Protect laboratory routes (laboratory only)
    if (pathname.startsWith('/laboratory')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        if (session.user.role !== 'laboratory') {
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
    }

    // Protect profile page (any authenticated user)
    if (pathname.startsWith('/profile')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // Protect API routes
    if (pathname.startsWith('/api/orders') || pathname.startsWith('/api/profile') || pathname.startsWith('/api/catalog')) {
        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    return NextResponse.next();
}
