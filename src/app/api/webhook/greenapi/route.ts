import { NextRequest, NextResponse } from 'next/server';
import { processIncomingMessage } from '@/lib/chatbot';

/**
 * POST /api/webhook/greenapi
 * 
 * Receives incoming webhooks from Green API.
 * Webhook URL should be set in Green API dashboard:
 *   https://your-domain.com/api/webhook/greenapi
 * 
 * Green API sends different webhook types:
 * - incomingMessageReceived — new message from user
 * - outgoingMessageStatus — delivery/read status update
 * - stateInstanceChanged — connection status change
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { typeWebhook, messageData, senderData, instanceData } = body;

        // Log for debugging
        console.log(`[Webhook] Type: ${typeWebhook}`, JSON.stringify(body).substring(0, 200));

        // Handle incoming messages
        if (typeWebhook === 'incomingMessageReceived') {
            const chatId = senderData?.chatId;
            const senderName = senderData?.senderName || senderData?.sender;

            if (!chatId || !messageData) {
                return NextResponse.json({ status: 'ignored', reason: 'no chatId or messageData' });
            }

            // Skip group messages
            if (chatId.includes('@g.us')) {
                return NextResponse.json({ status: 'ignored', reason: 'group message' });
            }

            // Extract message text
            let messageText = '';
            const msgType = messageData.typeMessage;

            if (msgType === 'textMessage') {
                messageText = messageData.textMessageData?.textMessage || '';
            } else if (msgType === 'extendedTextMessage') {
                messageText = messageData.extendedTextMessageData?.text || '';
            } else if (msgType === 'interactiveResponseMessage') {
                // Button click response
                messageText = messageData.interactiveResponseMessageData?.selectedButtonId || '';
            } else {
                // For now, skip non-text messages (images, audio, etc.)
                messageText = `[${msgType}]`;
            }

            if (!messageText) {
                return NextResponse.json({ status: 'ignored', reason: 'empty message' });
            }

            // Process with chatbot
            const handled = await processIncomingMessage(chatId, messageText, senderName);

            return NextResponse.json({
                status: 'ok',
                handled,
                chatId,
            });
        }

        // Handle message status updates (delivered, read)
        if (typeWebhook === 'outgoingMessageStatus') {
            const { idMessage, status } = body;
            // Could update ChatMessage.status here if needed
            console.log(`[Webhook] Message ${idMessage} status: ${status}`);
            return NextResponse.json({ status: 'ok' });
        }

        // Handle instance state changes
        if (typeWebhook === 'stateInstanceChanged') {
            const state = body.stateInstance;
            console.log(`[Webhook] Instance state: ${state}`);
            return NextResponse.json({ status: 'ok', state });
        }

        return NextResponse.json({ status: 'ignored', typeWebhook });

    } catch (error) {
        console.error('[Webhook] Error:', error);
        // Always return 200 to Green API to prevent retries
        return NextResponse.json({ status: 'error', message: String(error) }, { status: 200 });
    }
}

// GET — health check
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'Green API Webhook',
        timestamp: new Date().toISOString(),
    });
}
