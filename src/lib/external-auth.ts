import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates API key for external service requests (MedMundus → LensFlow).
 * Returns null if valid, or a NextResponse error if invalid.
 */
export function validateExternalApiKey(request: NextRequest): NextResponse | null {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

    const expectedKey = process.env.EXTERNAL_API_KEY;

    if (!expectedKey) {
        console.error('EXTERNAL_API_KEY is not set in environment variables');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!apiKey || apiKey !== expectedKey) {
        return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    return null; // Valid
}
