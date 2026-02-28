export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

/**
 * POST /api/demo/clear - No-op in database mode
 * Kept for backward compatibility with demo page
 */
export async function POST() {
    return NextResponse.json({ message: 'Database mode: use prisma commands for data management.', count: 0 });
}

/**
 * GET /api/demo/clear
 */
export async function GET() {
    return NextResponse.json({ message: 'Database mode: data is managed via Prisma.', count: 0 });
}
