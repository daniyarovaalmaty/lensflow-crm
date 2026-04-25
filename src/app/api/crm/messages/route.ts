import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { sendWhatsAppMessage } from '@/lib/greenApi';

// GET /api/crm/messages?leadId=xxx — get message history for a lead
export async function GET(req: NextRequest) {
    const leadId = new URL(req.url).searchParams.get('leadId');
    if (!leadId) {
        return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const messages = await prisma.chatMessage.findMany({
        where: { leadId },
        orderBy: { sentAt: 'asc' },
    });

    return NextResponse.json(messages);
}

// POST /api/crm/messages — send a message from a sales manager
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { leadId, content, userId } = body;

    if (!leadId || !content) {
        return NextResponse.json({ error: 'leadId and content are required' }, { status: 400 });
    }

    // Get lead to find phone number
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Send via Green API
    let externalId: string | null = null;
    try {
        const result = await sendWhatsAppMessage(lead.phone, content);
        externalId = result?.idMessage || null;
    } catch (err) {
        console.error('[GreenAPI] Failed to send message:', err);
        // Still save the message but mark as failed
    }

    // Save message to DB
    const message = await prisma.chatMessage.create({
        data: {
            leadId,
            channel: 'whatsapp',
            direction: 'outgoing',
            messageType: 'text',
            content,
            externalId,
            sentBy: userId || null,
            status: externalId ? 'sent' : 'failed',
        },
    });

    // Update lead's updatedAt
    await prisma.lead.update({
        where: { id: leadId },
        data: { updatedAt: new Date() },
    });

    // Log activity
    await prisma.leadActivity.create({
        data: {
            leadId,
            action: 'message_sent',
            details: content.substring(0, 100),
            userId: userId || null,
        },
    });

    return NextResponse.json(message, { status: 201 });
}
