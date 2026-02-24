export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

declare global {
    var orders: any[] | undefined;
}

/**
 * POST /api/demo/clear - Clear all orders from memory
 */
export async function POST() {
    global.orders = [];
    return NextResponse.json({ message: 'All orders cleared', count: 0 });
}

/**
 * GET /api/demo/clear - Clear all orders (convenient browser access)
 */
export async function GET() {
    global.orders = [];
    return NextResponse.json({ message: '✅ All orders cleared. База очищена.', count: 0 });
}
