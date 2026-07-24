export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { secret, phone, message } = await req.json();
    if (secret !== 'super-secret-123') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const GREEN_API_BASE = 'https://api.green-api.com';
    const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
    const TOKEN = process.env.GREEN_API_TOKEN;

    if (!INSTANCE_ID || !TOKEN) return NextResponse.json({ error: 'Config missing' }, { status: 500 });

    const chatId = `${phone.replace(/\D/g, '')}@c.us`;

    try {
        const url = `${GREEN_API_BASE}/waInstance${INSTANCE_ID}/sendMessage/${TOKEN}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message }),
        });
        const data = await res.json();
        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
