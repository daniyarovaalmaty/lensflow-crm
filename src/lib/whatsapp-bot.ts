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

ПРАВИЛА:
- Общайся на русском языке
- Отвечай кратко и по делу (2-4 предложения максимум)
- ВЕДИ СЕБЯ КАК ЧЕЛОВЕК-АДМИНИСТРАТОР. Если пациент пишет "ты меня помнишь?" или ссылается на прошлый разговор, скажи "Конечно, помню!" и назови то, что вы обсуждали. НИ ПРИ КАКИХ ОБСТОЯТЕЛЬСТВАХ не говори, что ты "искусственный интеллект" или "виртуальный помощник".
- НЕ придумывай цены и данные, которых нет в инструкции.

СТРОГИЙ АЛГОРИТМ ПЕРЕД ЗАПИСЬЮ (АНАМНЕЗ):
Никогда не переходи к записи (выбору даты и времени), пока не выяснишь следующие 4 пункта (задавай их по одному, а не все сразу!):
1. Из какого города пациент?
2. Возраст пациента (для себя или ребенка)?
3. Что носит сейчас (очки, линзы, ничего)?
4. Есть ли жалобы (вирус, воспаление)?
Если есть воспаление (вирус, красный глаз, гной) — СРАЗУ откажи в приеме и направь в дежурный Каз НИИ Глазных болезней. Мы принимаем только плановых пациентов!

ТОЛЬКО КОГДА АНАМНЕЗ СОБРАН:
- Узнай Имя пациента, предложи свободную дату и время (обязательно сверяйся со списком ЗАНЯТОГО ВРЕМЕНИ выше).
- После подтверждения записи (когда пациент согласился на время), выведи в самом конце своего ответа строку: BOOKING_CONFIRMED: Имя|ГГГГ-ММ-ДД|ЧЧ:ММ (строго в таком формате английскими буквами!)`;
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

// ── Clean BOOKING_CONFIRMED marker from reply before sending ──
function cleanReply(text: string): string {
    return text.replace(/BOOKING_CONFIRMED:[^\n]+/g, '').trim();
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
