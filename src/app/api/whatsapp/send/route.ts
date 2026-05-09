export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

const GREEN_API_BASE = 'https://api.green-api.com';
const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

/**
 * POST /api/whatsapp/send
 * Send a WhatsApp message to a lead/patient from the CRM.
 * Body: { phone: "77001234567", message: "Текст сообщения" }
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!INSTANCE_ID || !TOKEN) {
        return NextResponse.json({ error: 'Green API not configured' }, { status: 503 });
    }

    const { phone, message, leadId } = await req.json();
    if (!phone || !message) {
        return NextResponse.json({ error: 'phone and message required' }, { status: 400 });
    }

    // Normalize phone: ensure "7..." format without +
    const normalized = phone.replace(/\D/g, '');
    const chatId = `${normalized}@c.us`;

    try {
        const url = `${GREEN_API_BASE}/waInstance${INSTANCE_ID}/sendMessage/${TOKEN}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message }),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json({ error: 'Green API error', details: data }, { status: 502 });
        }

        // Save outgoing message to ChatMessage if leadId provided
        if (leadId) {
            try {
                await prisma.chatMessage.create({
                    data: {
                        leadId,
                        direction: 'outgoing',
                        content: message,
                        channel: 'whatsapp',
                        externalId: data.idMessage || null,
                        status: 'sent',
                        sentBy: session.user.id,
                        sentAt: new Date(),
                    },
                });
            } catch (e) {
                console.warn('Could not save chat message:', e);
            }
        }

        return NextResponse.json({ ok: true, idMessage: data.idMessage });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * GET /api/whatsapp/send — Check account status
 */
export async function GET() {
    if (!INSTANCE_ID || !TOKEN) {
        return NextResponse.json({ configured: false });
    }
    try {
        const url = `${GREEN_API_BASE}/waInstance${INSTANCE_ID}/getStateInstance/${TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        return NextResponse.json({ configured: true, state: data.stateInstance });
    } catch {
        return NextResponse.json({ configured: true, state: 'unknown' });
    }
}
