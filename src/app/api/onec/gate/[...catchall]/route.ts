import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    console.log('[1C WS CATCHALL GET]', req.url);
    return new NextResponse('Catchall GET: ' + req.url, { status: 404 });
}

export async function POST(req: NextRequest) {
    console.log('[1C WS CATCHALL POST]', req.url);
    return new NextResponse('Catchall POST: ' + req.url, { status: 404 });
}
