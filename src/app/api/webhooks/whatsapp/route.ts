export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/whatsapp
 * Green API → LensFlow CRM
 * Incoming WhatsApp message → creates/updates Lead + saves ChatMessage
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

    // Handle incoming messages only
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
    const senderName = senderData.senderName || senderData.chatName || '';

    // Extract message text
    let messageText = '';
    const msgType = messageData?.typeMessage;
    if (msgType === 'textMessage') {
        messageText = messageData?.textMessageData?.textMessage || '';
    } else if (msgType === 'extendedTextMessage') {
        messageText = messageData?.extendedTextMessageData?.text || '';
    } else if (msgType === 'imageMessage') {
        messageText = `📷 Фото${messageData?.imageMessageData?.caption ? ': ' + messageData.imageMessageData.caption : ''}`;
    } else if (msgType === 'audioMessage') {
        messageText = '🎤 Голосовое сообщение';
    } else if (msgType === 'documentMessage') {
        messageText = `📄 ${messageData?.documentMessageData?.fileName || 'Документ'}`;
    } else {
        messageText = `[${msgType || 'unknown'}]`;
    }

    // Find existing lead by phone (last 9 digits)
    let lead = await prisma.lead.findFirst({
        where: { phone: { contains: rawPhone.slice(-9) } },
    });

    if (!lead) {
        // Create new lead from WhatsApp message
        lead = await prisma.lead.create({
            data: {
                phone: rawPhone,
                name: senderName || null,
                source: 'whatsapp',
                stage: 'new_lead',
                funnel: 'sales',
            },
        });
    }

    // Save message to ChatMessage
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

    // Update lead updatedAt
    await prisma.lead.update({
        where: { id: lead.id },
        data: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, leadId: lead.id });
}

export async function GET() {
    return NextResponse.json({
        ok: true,
        service: 'LensFlow WhatsApp Webhook',
        instance: process.env.GREEN_API_INSTANCE_ID || 'not set',
    });
}
