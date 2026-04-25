/**
 * Green API Client for WhatsApp Business Integration
 * https://green-api.com/en/docs/api/
 * 
 * Uses environment variables:
 *   GREEN_API_INSTANCE_ID — Instance ID from green-api.com dashboard
 *   GREEN_API_TOKEN — API token from green-api.com dashboard
 */

const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID || '';
const API_TOKEN = process.env.GREEN_API_TOKEN || '';
const BASE_URL = `https://api.green-api.com/waInstance${INSTANCE_ID}`;

interface GreenApiResponse {
    idMessage?: string;
    [key: string]: any;
}

/**
 * Send a text message via WhatsApp
 * @param chatId — WhatsApp chat ID, e.g. "77001234567@c.us"
 * @param message — Text content to send
 */
export async function sendWhatsAppMessage(chatId: string, message: string): Promise<GreenApiResponse> {
    const url = `${BASE_URL}/sendMessage/${API_TOKEN}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chatId: formatChatId(chatId),
            message,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Green API error ${response.status}: ${errorText}`);
    }

    return response.json();
}

/**
 * Send interactive buttons (quick replies)
 */
export async function sendInteractiveButtons(
    chatId: string, 
    message: string, 
    buttons: Array<{ buttonId: string; buttonText: string }>
): Promise<GreenApiResponse> {
    const url = `${BASE_URL}/sendInteractiveButtons/${API_TOKEN}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chatId: formatChatId(chatId),
            message,
            buttons: buttons.map(b => ({
                buttonId: b.buttonId,
                buttonText: b.buttonText,
            })),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Green API interactive buttons error ${response.status}: ${errorText}`);
    }

    return response.json();
}

/**
 * Send typing indicator ("печатает...")
 */
export async function sendTyping(chatId: string): Promise<void> {
    const url = `${BASE_URL}/sendTyping/${API_TOKEN}`;
    
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chatId: formatChatId(chatId),
        }),
    }).catch(() => {});
}

/**
 * Check if the Green API instance is connected
 */
export async function getInstanceState(): Promise<{ stateInstance: string }> {
    const url = `${BASE_URL}/getStateInstance/${API_TOKEN}`;
    const response = await fetch(url);
    return response.json();
}

/**
 * Check if a phone number has WhatsApp
 */
export async function checkWhatsApp(phone: string): Promise<{ existsWhatsapp: boolean }> {
    const url = `${BASE_URL}/checkWhatsapp/${API_TOKEN}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: parseInt(phone.replace(/\D/g, '')) }),
    });
    return response.json();
}

/**
 * Mark chat as read
 */
export async function markChatRead(chatId: string): Promise<void> {
    const url = `${BASE_URL}/readChat/${API_TOKEN}`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: formatChatId(chatId) }),
    }).catch(() => {});
}

/**
 * Format phone number to Green API chatId format
 * Input: "+7 700 123 4567" or "77001234567" or "87001234567"
 * Output: "77001234567@c.us"
 */
function formatChatId(input: string): string {
    // Already formatted
    if (input.includes('@c.us')) return input;

    // Strip all non-digits
    let digits = input.replace(/\D/g, '');

    // Kazakhstan: convert 8xxx to 7xxx
    if (digits.startsWith('8') && digits.length === 11) {
        digits = '7' + digits.slice(1);
    }

    // Add country code if missing
    if (digits.length === 10) {
        digits = '7' + digits;
    }

    return `${digits}@c.us`;
}

export { formatChatId };
