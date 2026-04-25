/**
 * WhatsApp Chatbot — Lead Qualification & Appointment Booking
 * 
 * Flow:
 * 1. New message → Create/find Lead
 * 2. Greeting → Ask about interest
 * 3. Ask city → Save
 * 4. Ask age/concern → Qualify
 * 5. Offer appointment slots → Book
 * 6. Confirm → Create Reminder
 * 7. Transfer to human if needed
 */

import prisma from '@/lib/db/prisma';
import { sendWhatsAppMessage, sendTyping } from '@/lib/greenApi';

// Bot state stored in lead's tags array (simple state machine)
type BotState = 'greeting' | 'ask_city' | 'ask_concern' | 'offer_slots' | 'confirm_booking' | 'human_takeover' | 'completed';

function getBotState(tags: string[]): BotState {
    const stateTag = tags.find(t => t.startsWith('bot:'));
    return (stateTag?.replace('bot:', '') as BotState) || 'greeting';
}

function setBotState(tags: string[], state: BotState): string[] {
    const filtered = tags.filter(t => !t.startsWith('bot:'));
    filtered.push(`bot:${state}`);
    return filtered;
}

// Available appointment slots (hardcoded for now, later from MedMundus calendar)
function getAvailableSlots(): { date: string; time: string; display: string }[] {
    const slots: { date: string; time: string; display: string }[] = [];
    const now = new Date();

    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
        const date = new Date(now);
        date.setDate(date.getDate() + dayOffset);

        // Skip weekends
        if (date.getDay() === 0) continue;

        const dateStr = date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });

        for (const time of ['10:00', '14:00', '16:00']) {
            slots.push({
                date: date.toISOString().split('T')[0],
                time,
                display: `${dateStr} — ${time}`,
            });
        }
    }

    return slots.slice(0, 6); // Max 6 slots
}

/**
 * Process incoming WhatsApp message
 * Returns true if bot handled the message, false if should be forwarded to human
 */
export async function processIncomingMessage(
    chatId: string,
    messageText: string,
    senderName?: string,
): Promise<boolean> {

    // Find or create lead
    let lead = await prisma.lead.findFirst({
        where: { phone: chatId },
    });

    if (!lead) {
        lead = await prisma.lead.create({
            data: {
                phone: chatId,
                name: senderName || null,
                source: 'whatsapp',
                tags: ['bot:greeting'],
            },
        });

        await prisma.leadActivity.create({
            data: {
                leadId: lead.id,
                action: 'created',
                details: `Лид создан автоматически из WhatsApp. Имя: ${senderName || 'неизвестно'}`,
            },
        });
    }

    // Save incoming message
    await prisma.chatMessage.create({
        data: {
            leadId: lead.id,
            channel: 'whatsapp',
            direction: 'incoming',
            messageType: 'text',
            content: messageText,
        },
    });

    const state = getBotState(lead.tags);
    const lowerMsg = messageText.toLowerCase().trim();

    // Check for human transfer keywords
    if (['оператор', 'человек', 'менеджер', 'позвоните', 'перезвоните'].some(k => lowerMsg.includes(k))) {
        await transferToHuman(lead.id, chatId);
        return true;
    }

    // If already in human takeover, don't respond
    if (state === 'human_takeover' || state === 'completed') {
        return false;
    }

    // Process based on current state
    await sendTyping(chatId);
    await delay(1000); // Natural typing delay

    switch (state) {
        case 'greeting':
            return await handleGreeting(lead.id, chatId, senderName);

        case 'ask_city':
            return await handleCity(lead.id, chatId, messageText);

        case 'ask_concern':
            return await handleConcern(lead.id, chatId, messageText);

        case 'offer_slots':
            return await handleSlotSelection(lead.id, chatId, messageText);

        case 'confirm_booking':
            return await handleBookingConfirmation(lead.id, chatId, messageText);

        default:
            return await handleGreeting(lead.id, chatId, senderName);
    }
}

// ── State handlers ──

async function handleGreeting(leadId: string, chatId: string, name?: string): Promise<boolean> {
    const greeting = name ? `Здравствуйте, ${name}! 👋` : 'Здравствуйте! 👋';

    const msg = `${greeting}

Вас интересуют *ночные ортокератологические линзы* для коррекции зрения?

Ночные линзы:
✅ Останавливают ухудшение зрения у детей в 90% случаев
✅ Коррекция зрения во сне — днём без очков и линз
✅ Производство в Казахстане — доступная цена

Подскажите, *в каком вы городе?*`;

    await sendBotMessage(leadId, chatId, msg);
    await updateBotState(leadId, 'ask_city');
    await prisma.lead.update({
        where: { id: leadId },
        data: { stage: 'contacted' },
    });

    return true;
}

async function handleCity(leadId: string, chatId: string, messageText: string): Promise<boolean> {
    const city = messageText.trim();

    await prisma.lead.update({
        where: { id: leadId },
        data: { city },
    });

    const msg = `📍 ${city} — отлично!

Подскажите, для *кого* вы ищете ночные линзы?

1️⃣ Для ребёнка (до 18 лет)
2️⃣ Для себя (взрослый)

Просто напишите 1 или 2 😊`;

    await sendBotMessage(leadId, chatId, msg);
    await updateBotState(leadId, 'ask_concern');

    return true;
}

async function handleConcern(leadId: string, chatId: string, messageText: string): Promise<boolean> {
    const isChild = messageText.includes('1') || messageText.toLowerCase().includes('ребён') || messageText.toLowerCase().includes('дет');
    const concern = isChild ? 'Для ребёнка' : 'Для взрослого';

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            stage: 'qualified',
            notes: `Запрос: ${concern}`,
        },
    });

    await prisma.leadActivity.create({
        data: {
            leadId,
            action: 'stage_change',
            details: `Квалифицирован. ${concern}`,
        },
    });

    const slots = getAvailableSlots();
    const slotList = slots.map((s, i) => `${i + 1}️⃣ ${s.display}`).join('\n');

    const msg = `Отлично! У нас есть партнёрская клиника *New Eye* 🏥

Можем записать вас на *бесплатную консультацию* к офтальмологу.

Свободное время:
${slotList}

Напишите *номер удобного времени* (1-${slots.length}) 📅`;

    await sendBotMessage(leadId, chatId, msg);
    await updateBotState(leadId, 'offer_slots');

    return true;
}

async function handleSlotSelection(leadId: string, chatId: string, messageText: string): Promise<boolean> {
    const slots = getAvailableSlots();
    const num = parseInt(messageText.trim());

    if (isNaN(num) || num < 1 || num > slots.length) {
        const msg = `Пожалуйста, напишите номер от 1 до ${slots.length}, чтобы выбрать время 😊`;
        await sendBotMessage(leadId, chatId, msg);
        return true;
    }

    const selectedSlot = slots[num - 1];
    const appointmentAt = new Date(`${selectedSlot.date}T${selectedSlot.time}:00+05:00`);

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            appointmentAt,
            stage: 'appointment',
        },
    });

    const msg = `Вы выбрали: *${selectedSlot.display}*

Подтверждаете запись на бесплатную консультацию в клинику New Eye?

Напишите *Да* для подтверждения ✅`;

    await sendBotMessage(leadId, chatId, msg);
    await updateBotState(leadId, 'confirm_booking');

    return true;
}

async function handleBookingConfirmation(leadId: string, chatId: string, messageText: string): Promise<boolean> {
    const isYes = ['да', 'yes', 'ок', 'подтвер', 'конеч', 'хорош', 'давай'].some(k => messageText.toLowerCase().includes(k));

    if (!isYes) {
        const msg = 'Хотите выбрать другое время? Напишите *другое время* или *Да* для подтверждения текущего.';
        await sendBotMessage(leadId, chatId, msg);
        return true;
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead?.appointmentAt) return false;

    const dateDisplay = lead.appointmentAt.toLocaleDateString('ru-RU', {
        weekday: 'long', day: 'numeric', month: 'long',
    });
    const timeDisplay = lead.appointmentAt.toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit',
    });

    // Create reminders
    const dayBefore = new Date(lead.appointmentAt);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(10, 0, 0, 0);

    const hoursBefore = new Date(lead.appointmentAt);
    hoursBefore.setHours(hoursBefore.getHours() - 2);

    await prisma.reminder.createMany({
        data: [
            {
                leadId,
                type: 'appointment_1d',
                channel: 'whatsapp',
                message: `Напоминаем! Завтра у вас консультация в клинике New Eye в ${timeDisplay}. Ждём вас! 😊`,
                scheduledAt: dayBefore,
            },
            {
                leadId,
                type: 'appointment_2h',
                channel: 'whatsapp',
                message: `Через 2 часа ваша консультация в New Eye. Адрес: [адрес клиники]. До встречи! 🏥`,
                scheduledAt: hoursBefore,
            },
        ],
    });

    await prisma.leadActivity.create({
        data: {
            leadId,
            action: 'appointment_booked',
            details: `Запись: ${dateDisplay} в ${timeDisplay}`,
        },
    });

    const msg = `✅ *Готово!* Вы записаны на бесплатную консультацию

📅 *${dateDisplay}*
🕐 *${timeDisplay}*
🏥 *Клиника New Eye*

За день и за 2 часа до приёма мы пришлём напоминание.

Если нужно перенести — просто напишите нам сюда! 😊`;

    await sendBotMessage(leadId, chatId, msg);
    await updateBotState(leadId, 'completed');

    return true;
}

async function transferToHuman(leadId: string, chatId: string): Promise<void> {
    await updateBotState(leadId, 'human_takeover');

    const msg = `Хорошо! Передаю вас нашему менеджеру. Он свяжется с вами в ближайшее время 👋`;
    await sendBotMessage(leadId, chatId, msg);

    await prisma.leadActivity.create({
        data: {
            leadId,
            action: 'stage_change',
            details: 'Переведён на живого менеджера',
        },
    });
}

// ── Helpers ──

async function sendBotMessage(leadId: string, chatId: string, text: string): Promise<void> {
    let externalId: string | null = null;

    try {
        const result = await sendWhatsAppMessage(chatId, text);
        externalId = result?.idMessage || null;
    } catch (err) {
        console.error('[Chatbot] Failed to send:', err);
    }

    await prisma.chatMessage.create({
        data: {
            leadId,
            channel: 'whatsapp',
            direction: 'outgoing',
            messageType: 'text',
            content: text,
            externalId,
            status: externalId ? 'sent' : 'failed',
        },
    });
}

async function updateBotState(leadId: string, state: BotState): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const newTags = setBotState(lead.tags, state);
    await prisma.lead.update({
        where: { id: leadId },
        data: { tags: newTags },
    });
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
