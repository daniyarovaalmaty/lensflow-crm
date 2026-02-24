export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

declare global {
    var orders: any[] | undefined;
}

/**
 * POST /api/demo/seed
 * Demo orders disabled — production mode, starts with empty orders.
 */
export async function POST() {
    // Clear any existing orders to ensure clean state
    global.orders = [];
    return NextResponse.json({
        message: 'Production mode: no demo orders seeded.',
        count: 0,
    });
}
