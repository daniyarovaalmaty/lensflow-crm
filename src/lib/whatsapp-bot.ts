/**
 * LensFlow WhatsApp AI Bot
 * Powered by GPT-4o — understands Russian, collects patient info,
 * books appointments, creates patient records in CRM.
 */

import prisma from '@/lib/db/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GREEN_API_BASE = 'https://api.green-api.com';
const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

// ── Load dynamic system prompt from BotConfig DB ──
export async function buildSystemPrompt(): Promise<string> {
    const configs = await prisma.botConfig.findMany();
    const cfg: Record<string, string> = {};
    for (const c of configs) cfg[c.key] = c.value;

    // Fetch busy slots for the next 14 days
    const now = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(now.getDate() + 14);

    const upcomingLeads = await prisma.lead.findMany({
        where: {
            appointmentAt: { gte: now, lte: twoWeeksLater }
        },
        select: { appointmentAt: true }
    });

    const busySlots = upcomingLeads
        .map(l => l.appointmentAt)
        .filter((d): d is Date => d !== null)
        .map(d => {
            const dateStr = d.toISOString().split('T')[0];
            const timeStr = d.toISOString().split('T')[1].substring(0, 5);
            return `${dateStr} ${timeStr}`;
        });

    const busyText = busySlots.length > 0 
        ? `\nЗАНЯТОЕ ВРЕМЯ НА БЛИЖАЙШИЕ 2 НЕДЕЛИ (НЕ ПРЕДЛАГАЙ ЭТИ ОКНА! Они уже заняты):\n${busySlots.join(', ')}\nПредлагай время с интервалом в 30 минут (например 10:00, 10:30) и только в рабочие часы.`
        : `\nСвободных окон много. Предлагай время с интервалом в 30 минут (например 10:00, 10:30) и только в рабочие часы.`;

    return `Ты — профессиональный и заботливый администратор клиники ${cfg.clinic_name || 'New EYE'}. Твоя задача — вести естественный диалог с пациентом.
Стиль общения: ${cfg.bot_tone || 'дружелюбный, профессиональный, на "вы"'}

ИНФОРМАЦИЯ О КЛИНИКЕ:
📍 Адрес: ${cfg.address || 'уточняйте у администратора'}
🕐 Часы работы: ${cfg.working_hours || 'Пн-Сб 9:00-19:00'}
👨‍⚕️ Врачи: ${cfg.doctors || 'наши специалисты'}
📱 Контакт: ${cfg.phone_contact || 'этот WhatsApp'}

УСЛУГИ:
${cfg.services || ''}

ЦЕНЫ:
${cfg.prices || ''}

ОБ ОРТО-К ЛИНЗАХ:
${cfg.ortho_k_info || ''}

ЧАСТЫЕ ВОПРОСЫ:
${cfg.faq || ''}

${cfg.extra_rules ? 'ДОПОЛНИТЕЛЬНО:\n' + cfg.extra_rules : ''}
${busyText}

ПРАВИЛА ОБЩЕНИЯ И ЗАПИСИ (ОЧЕНЬ СТРОГО):
- Отвечай кратко (1-2 предложения), веди себя как человек-администратор, будь вежлив.
- Если пациент спрашивает "ты меня помнишь?", скажи "Конечно, помню!" и упомяни контекст. Никогда не говори, что ты бот.
- НИКОГДА не задавай больше одного вопроса в сообщении!

*** АЛГОРИТМ ПРИЕМА ЗАЯВКИ (ЧЕКЛИСТ) ***
Прежде чем записывать пациента, ты ОБЯЗАН собрать 4 факта (анамнез). Проверь историю переписки, знаешь ли ты:
[ ] 1. Из какого города пациент?
[ ] 2. Возраст (для себя или ребенка)?
[ ] 3. Что носит сейчас (очки, линзы)?
[ ] 4. Есть ли воспаление, гной или покраснение?

ДЕЙСТВИЕ 1 (ЕСЛИ ЧЕКЛИСТ НЕ ЗАПОЛНЕН):
Если пациент хочет записаться, но в истории чата НЕТ ответов на все 4 пункта выше — тебе СТРОГО ЗАПРЕЩЕНО спрашивать удобное время, дату или имя. Ты должен просто задать ОДИН из недостающих вопросов чеклиста. 
(Например: "Отлично, с удовольствием вас запишу! Но сначала подскажите, вы из Алматы?" или "Поняла вас. А коррекция нужна вам или ребенку?").
(Если на пункт 4 пациент отвечает "да, есть воспаление" - откажи в приеме и направь в дежурную больницу).

ДЕЙСТВИЕ 2 (ЕСЛИ ВЕСЬ ЧЕКЛИСТ СОБРАН):
ТОЛЬКО когда все 4 пункта выяснены:
- Узнай Имя пациента (если еще не знаешь).
- Предложи свободные дату и время (обязательно сверяйся со списком ЗАНЯТОГО ВРЕМЕНИ выше).

ПОДТВЕРЖДЕНИЕ ЗАПИСИ:
Когда пациент назвал Имя, Дату и Время, и ты соглашаешься — напиши подтверждение и В САМОМ КОНЦЕ добавь скрытый код:
BOOKING_CONFIRMED: Имя|ГГГГ-ММ-ДД|ЧЧ:ММ

ОТМЕНА ЗАПИСИ:
Если пациент просит отменить существующую запись, спроси его Имя, чтобы подтвердить отмену.
Когда он назовет Имя, подтверди отмену и В САМОМ КОНЦЕ добавь скрытый код:
BOOKING_CANCELED: Имя`;
}

// ── Send reply via Green API ──
async function sendWhatsApp(phone: string, message: string): Promise<void> {
    if (!INSTANCE_ID || !TOKEN) return;
    const chatId = `${phone.replace(/\D/g, '')}@c.us`;
    await fetch(`${GREEN_API_BASE}/waInstance${INSTANCE_ID}/sendMessage/${TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
    });
}

// ── Parse BOOKING_CONFIRMED from AI response ──
function parseBookingConfirmation(text: string): { name: string; date: string; time: string } | null {
    const match = text.match(/BOOKING_CONFIRMED:\s*([^|]+)\|([^|]+)\|([^\s]+)/);
    if (!match) return null;
    return {
        name: match[1].trim(),
        date: match[2].trim(),
        time: match[3].trim(),
    };
}

// ── Parse BOOKING_CANCELED from AI response ──
function parseBookingCancellation(text: string): { name: string } | null {
    const match = text.match(/BOOKING_CANCELED:\s*([^\n]+)/);
    if (!match) return null;
    return { name: match[1].trim() };
}

// ── Clean BOOKING_CONFIRMED and BOOKING_CANCELED markers from reply before sending ──
function cleanReply(text: string): string {
    return text.replace(/BOOKING_CONFIRMED:[^\n]+/g, '').replace(/BOOKING_CANCELED:[^\n]+/g, '').trim();
}

// ── Main bot handler ──
export async function handleWhatsAppBot(phone: string, incomingText: string): Promise<void> {
    const normalizedPhone = phone.replace(/\D/g, '');

    // Load or create bot session
    let session = await prisma.botSession.upsert({
        where: { phone: normalizedPhone },
        update: {},
        create: { phone: normalizedPhone },
    });

    // If session is "done" or "paused" — restart if user messages again
    if (session.state === 'done') {
        await prisma.botSession.update({
            where: { phone: normalizedPhone },
            data: { state: 'greeting', history: [] },
        });
        session = { ...session, state: 'greeting', history: [] as any };
    }

    // Build conversation history
    const history: Array<{ role: string; content: string }> = Array.isArray(session.history)
        ? (session.history as any[])
        : [];

    // Add user message to history
    history.push({ role: 'user', content: incomingText });

    // Call GPT-4o with dynamic system prompt from DB
    const systemPrompt = await buildSystemPrompt();
    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ],
        max_tokens: 400,
        temperature: 0.7,
    });

    const aiReply = completion.choices[0]?.message?.content || 'Извините, произошла ошибка. Попробуйте ещё раз.';

    // Add AI reply to history
    history.push({ role: 'assistant', content: aiReply });

    // Keep history to last 20 messages to avoid token overflow
    const trimmedHistory = history.slice(-20);

    // Check for booking confirmation
    const booking = parseBookingConfirmation(aiReply);

    if (booking) {
        // Parse appointment datetime
        let appointmentAt: Date | null = null;
        try {
            appointmentAt = new Date(`${booking.date}T${booking.time}:00`);
        } catch {}

        // Create or update Lead
        let lead = await prisma.lead.findFirst({
            where: { phone: { contains: normalizedPhone.slice(-9) } },
        });

        if (!lead) {
            lead = await prisma.lead.create({
                data: {
                    phone: normalizedPhone,
                    name: booking.name || null,
                    source: 'whatsapp',
                    stage: 'appointment',
                    funnel: 'sales',
                    appointmentAt: appointmentAt || undefined,
                },
            });
        } else {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    name: booking.name || lead.name,
                    stage: 'appointment',
                    appointmentAt: appointmentAt || undefined,
                },
            });
        }

        // Create Patient record
        let patient = await prisma.patient.findFirst({
            where: { phone: { contains: normalizedPhone.slice(-9) } },
        });

        if (!patient) {
            patient = await prisma.patient.create({
                data: {
                    name: booking.name || `WA ${normalizedPhone.slice(-4)}`,
                    phone: normalizedPhone,
                },
            });
        }

        // Save ChatMessage (outgoing bot reply)
        await prisma.chatMessage.create({
            data: {
                leadId: lead.id,
                direction: 'outgoing',
                content: cleanReply(aiReply),
                channel: 'whatsapp',
                status: 'sent',
            },
        });

        // Update session
        await prisma.botSession.update({
            where: { phone: normalizedPhone },
            data: {
                state: 'done',
                collectedName: booking.name,
                collectedDate: booking.date,
                collectedTime: booking.time,
                bookedAt: appointmentAt || null,
                leadId: lead.id,
                patientId: patient.id,
                history: trimmedHistory,
            },
        });

        // Send clean reply (without BOOKING_CONFIRMED marker)
        await sendWhatsApp(normalizedPhone, cleanReply(aiReply));
        return;
    }

    // Check for booking cancellation
    const cancellation = parseBookingCancellation(aiReply);
    if (cancellation) {
        let lead = await prisma.lead.findFirst({
            where: { phone: { contains: normalizedPhone.slice(-9) } },
        });

        if (lead) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    appointmentAt: null, // Clear appointment
                    stage: 'new_lead', // Reset stage
                },
            });

            await prisma.chatMessage.create({
                data: {
                    leadId: lead.id,
                    direction: 'outgoing',
                    content: cleanReply(aiReply),
                    channel: 'whatsapp',
                    status: 'sent',
                },
            });
        }

        // Update session
        await prisma.botSession.update({
            where: { phone: normalizedPhone },
            data: {
                state: 'greeting', // Reset state
                bookedAt: null,
                history: trimmedHistory,
            },
        });

        await sendWhatsApp(normalizedPhone, cleanReply(aiReply));
        return;
    }

    // Normal reply — save history and send
    await prisma.botSession.update({
        where: { phone: normalizedPhone },
        data: { history: trimmedHistory },
    });

    // Save incoming message to ChatMessage for lead if exists
    const existingLead = await prisma.lead.findFirst({
        where: { phone: { contains: normalizedPhone.slice(-9) } },
    });
    if (existingLead) {
        await prisma.chatMessage.create({
            data: {
                leadId: existingLead.id,
                direction: 'outgoing',
                content: aiReply,
                channel: 'whatsapp',
                status: 'sent',
            },
        });
    }

    await sendWhatsApp(normalizedPhone, aiReply);
}
