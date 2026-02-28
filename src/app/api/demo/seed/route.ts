export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

/**
 * POST /api/demo/seed
 * In multi-tenant mode, demo data is managed via prisma/seed.ts
 * This route is kept for backward compatibility with the demo page
 */
export async function POST() {
    return NextResponse.json({
        message: 'Database-backed mode: use prisma db seed for initial data.',
        count: 0,
    });
}
