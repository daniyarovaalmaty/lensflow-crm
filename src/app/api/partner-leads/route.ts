import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

const GREEN_API_BASE = 'https://api.green-api.com';
const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;
// Your personal WhatsApp to receive notifications
const NOTIFY_PHONE = '77772962608';

async function notifyWhatsApp(lead: { name: string; phone: string; city?: string | null; clinicName?: string | null; message?: string | null }) {
    if (!INSTANCE_ID || !TOKEN) return;

    const lines = [
        `🔔 *Новая заявка с лендинга!*`,
        ``,
        `👤 *Имя:* ${lead.name}`,
        `📞 *Телефон:* ${lead.phone}`,
        lead.city ? `📍 *Город:* ${lead.city}` : '',
        lead.clinicName ? `🏥 *Клиника:* ${lead.clinicName}` : '',
        lead.message ? `💬 *Сообщение:* ${lead.message}` : '',
        ``,
        `📅 ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`,
    ].filter(Boolean).join('\n');

    try {
        await fetch(`${GREEN_API_BASE}/waInstance${INSTANCE_ID}/sendMessage/${TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId: `${NOTIFY_PHONE}@c.us`,
                message: lines,
            }),
        });
    } catch (err) {
        console.error('WhatsApp notification error:', err);
    }
}

// POST — save lead from partner landing page
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, phone, city, clinicName, message } = body;

        if (!name || !phone) {
            return NextResponse.json({ error: 'Имя и телефон обязательны' }, { status: 400 });
        }

        const lead = await prisma.lead.create({
            data: {
                name,
                phone,
                city: city || null,
                source: 'website',
                funnel: 'sales',
                stage: 'new_lead',
                notes: [
                    clinicName ? `Клиника: ${clinicName}` : '',
                    message ? `Сообщение: ${message}` : '',
                ].filter(Boolean).join('\n') || null,
                tags: ['partner_landing'],
            },
        });

        // Send WhatsApp notification (non-blocking)
        notifyWhatsApp({ name, phone, city, clinicName, message }).catch(() => {});

        return NextResponse.json({ success: true, id: lead.id });
    } catch (error: any) {
        console.error('Partner lead error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET — list partner leads
export async function GET() {
    try {
        const leads = await prisma.lead.findMany({
            where: { tags: { has: 'partner_landing' } },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(leads);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
