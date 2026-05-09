export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { handleWhatsAppBot } from '@/lib/whatsapp-bot';

const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || '';

// Phone numbers that bypass the AI bot (admins/doctors managing the account)
const BOT_BLACKLIST = (process.env.WHATSAPP_BOT_BLACKLIST || '').split(',').filter(Boolean);

/**
 * POST /api/webhooks/whatsapp
 * Receives all Green API webhook events.
 * Routes incoming messages to the AI bot.
 */
export async function POST(req: NextRequest) {
    // Verify secret if set
    const secret = req.headers.get('x-webhook-secret');
    if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const typeWebhook = body?.typeWebhook;

    // Only handle incoming messages
    if (typeWebhook !== 'incomingMessageReceived') {
        return NextResponse.json({ ok: true, skipped: typeWebhook });
    }

    const senderData = body?.senderData;
    const messageData = body?.messageData;
    if (!senderData?.chatId) return NextResponse.json({ ok: true });

    // Skip group chats
    if (senderData.chatId.includes('@g.us')) {
        return NextResponse.json({ ok: true, skipped: 'group' });
    }

    const rawPhone = senderData.chatId.replace('@c.us', '');
    const normalizedPhone = rawPhone.replace(/\D/g, '');
    const senderName = senderData.senderName || senderData.chatName || '';

    // Extract message text
    let messageText = '';
    const msgType = messageData?.typeMessage;
    if (msgType === 'textMessage') {
        messageText = messageData?.textMessageData?.textMessage || '';
    } else if (msgType === 'extendedTextMessage') {
        messageText = messageData?.extendedTextMessageData?.text || '';
    } else if (msgType === 'imageMessage') {
        messageText = `[Фото]${messageData?.imageMessageData?.caption ? ': ' + messageData.imageMessageData.caption : ''}`;
    } else if (msgType === 'audioMessage') {
        messageText = '[Голосовое сообщение]';
    } else {
        // Non-text messages — acknowledge but don't bot-reply
        return NextResponse.json({ ok: true, skipped: msgType });
    }

    if (!messageText.trim()) return NextResponse.json({ ok: true });

    // Find or create Lead (for message storage)
    let lead = await prisma.lead.findFirst({
        where: { phone: { contains: normalizedPhone.slice(-9) } },
    });

    if (!lead) {
        lead = await prisma.lead.create({
            data: {
                phone: normalizedPhone,
                name: senderName || null,
                source: 'whatsapp',
                stage: 'new_lead',
                funnel: 'sales',
            },
        });
    }

    // Save incoming message
    await prisma.chatMessage.create({
        data: {
            leadId: lead.id,
            direction: 'incoming',
            content: messageText,
            channel: 'whatsapp',
            status: 'delivered',
            sentAt: new Date(),
        },
    });

    // Update lead
    await prisma.lead.update({
        where: { id: lead.id },
        data: {
            name: lead.name || senderName || null,
            updatedAt: new Date(),
        },
    });

    // Skip bot for blacklisted numbers
    if (BOT_BLACKLIST.some(b => normalizedPhone.includes(b.replace(/\D/g, '')))) {
        return NextResponse.json({ ok: true, bot: 'skipped (blacklist)' });
    }

    // Run AI bot asynchronously (don't block webhook response)
    // Vercel has 30s timeout so we run it synchronously but catch errors
    try {
        await handleWhatsAppBot(normalizedPhone, messageText);
    } catch (err: any) {
        console.error('[WhatsApp Bot Error]', err?.message);
        // Bot failed silently — message was still saved
    }

    return NextResponse.json({ ok: true, leadId: lead.id });
}

export async function GET() {
    return NextResponse.json({
        ok: true,
        service: 'LensFlow WhatsApp AI Bot',
        instance: process.env.GREEN_API_INSTANCE_ID || 'not set',
        bot: 'active',
    });
}
