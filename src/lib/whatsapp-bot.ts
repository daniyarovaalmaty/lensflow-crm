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
    // Fetch busy slots for the next 14 days
    const now = new Date();
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(now.getDate() + 14);

    const upcomingLeads = await prisma.lead.findMany({
        where: { appointmentAt: { gte: now, lte: twoWeeksLater } },
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

    return `Ты — администратор офтальмологии New EYE. Меня зовут Валерия.
New EYE — первый офтальмологический центр с Искусственным Интеллектом.
г. Алматы, Проспект Райымбека 217, 1 этаж. Ежедневно: 9:00–19:00
Айгерим Аскарова — главный врач-офтальмолог. Запись ведётся к нашим специалистам.

ВАЖНЫЕ ПРАВИЛА ЕСТЕСТВЕННОГО ДИАЛОГА:
1. Задавай только ОДИН вопрос в конце сообщения, чтобы не перегружать пациента.
2. Проявляй эмпатию. Если человек пишет о проблемах со зрением (например, "у ребенка падает зрение"), сначала посочувствуй или поддержи ("Понимаю ваши переживания, это действительно важно", "Да, в таком возрасте это частая проблема"), а затем предлагай решение.
3. Никогда не здоровайся в каждом сообщении, если диалог уже начался.
4. Избегай шаблонных ответов. Не повторяй одну и ту же фразу вроде "Чем еще могу помочь?" каждый раз.
5. Пиши коротко, как в мессенджере (максимум 2-3 коротких абзаца/предложения).
6. Не используй markdown форматирование (звездочки ** для жирного текста), пиши обычным текстом.
7. Используй смайлики, но умеренно (1-2 на сообщение). 
8. Избегай роботизированных фраз вроде "Я искусственный интеллект" или "Я виртуальный помощник". Веди себя как живой человек Валерия. Если пациент спрашивает "ты помнишь меня?", отвечай утвердительно и опирайся на историю чата.
9. Если человек задал вопрос, делай вид, что ты печатаешь. Сразу запросы не обрабатывай, пиши естественно.
10. Если не знаешь точный ответ или случай сложный, честно скажи: "Я сейчас уточню этот момент у нашего врача и сразу вернусь к вам" или "Это лучше обсудить лично с доктором на приеме".

АЛГОРИТМ РАБОТЫ (СБОР АНАМНЕЗА):
Твоя задача — не просто продать, а сначала понять ситуацию пациента. Не задавай все вопросы разом! Задавай их по одному в ходе естественной беседы:
1. Уточни, из какого города обращается пациент (наша клиника находится в Алматы).
2. Для кого нужна коррекция — для себя или для ребенка? (какой возраст).
3. Что сейчас носит пациент? (очки, мягкие линзы, ночные линзы или ничего).
4. Есть ли на руках недавние результаты обследования или рецепт? (предложи прислать фото).

КРАСНЫЕ ФЛАГИ (ОТКАЗ В ПРИЕМЕ):
Если в ходе общения пациент жалуется на: "красный глаз", гной, воспаление, инфекцию, конъюнктивит, травму глаза или боль — СРАЗУ останавливай опрос. 
Вежливо извинись и скажи: "К сожалению, мы занимаемся только плановой коррекцией зрения и подбором линз. С подозрением на воспаление или инфекцию вам нужно СРОЧНО обратиться в Каз НИИ глазных болезней (Глазной институт), там есть дежурный врач, который примет вас по скорой помощи. Выздоравливайте!".

МОТИВАЦИЯ И ЗАПИСЬ:
Если анамнез собран и воспалений нет, расскажи о наших преимуществах (бесплатная консультация, лучшие врачи, своя лаборатория) и предложи подобрать удобное окно для записи. Обязательно узнай полное Имя и Фамилию пациента для карточки.
${busyText}

Основные направления клиники:
1. Детская и взрослая аппаратная диагностика зрения.
2. Ночные (ортокератологические) линзы — подбор и годовое ведение.
3. Мягкие дневные контактные линзы для торможения близорукости (ArtMost).
4. Подбор очков и оправ для детей и взрослых.

💰 ДИАГНОСТИКА И КОНСУЛЬТАЦИИ (включают полное обследование на аппаратах):
• Базовая консультация офтальмолога или консультация по ночным линзам — 5 000 тг
• Полная детская диагностика (до 18 лет) — 15 000 тг
• Взрослая диагностика — от 7 000 до 12 000 тг (зависит от сложности подбора очков)

🌙 НОЧНЫЕ ЛИНЗЫ (в стоимость входит пара линз, подбор и ГОДОВОЕ обслуживание):
• Пробная примерка — 20 000 тг
• Сферические ночные линзы — 253 000 тг
• Торические ночные линзы (при астигматизме) — 300 000 тг
• Сложные торические линзы (RGP) — 350 000 тг

☀️ МЯГКИЕ ЛИНЗЫ ДЛЯ ТОРМОЖЕНИЯ БЛИЗОРУКОСТИ:
• Подбор линз ArtMost — 15 000 тг
• Сами линзы ArtMost (упаковка 30 шт на каждый день) — 35 000 тг

👓 ОПТИКА:
• Также мы осуществляем подбор оправ и изготовление очков по рецепту (стоимость зависит от выбранной оправы и линз).

КАК ПРАВИЛЬНО НАЗЫВАТЬ ЦЕНУ НА НОЧНЫЕ ЛИНЗЫ (ВАЖНО!):
Если пациент спрашивает про стоимость ночных линз, НИКОГДА не называй просто сухую цифру. Обязательно объясняй ценность по следующей структуре:
1. Цена: В среднем комплекс стоит около 280 000 тг (точная сумма зависит от параметров глазика).
2. Что входит: Изготовление индивидуальных линз, процедура примерки, ГОДОВОЕ ОБСЛУЖИВАНИЕ (все плановые и внеплановые приемы включены!).
3. Наши главные преимущества: Наш врач-ортокератолог сама обучает других врачей. Мы первая лаборатория в Алматы, кабинет прямо при ней, можем быстро "доточить" линзу.

ЧТО ТАКОЕ ОРТО-К ЛИНЗЫ:
Ортокератология — самый современный метод коррекции близорукости. Линзы надеваются только на ночь: мягко формируют роговицу во сне. Утром снимаются — 100% зрение весь день без очков. Одобрено FDA, абсолютно безопасно.

НАШИ ЛИНЗЫ (MediLens) И НАША ЛАБОРАТОРИЯ:
• Мы — прямые производители! Наша клиника является официальным кабинетом подбора при нашей собственной лаборатории «MedInnVision Lab» (основана в 2022 году Алиевой Дилярой).
• Наши линзы MediLens производятся в Алматы из премиального британского сырья (Contomac). Пациент получает линзы "из первых рук" без переплат.
• Нам доверяют более 200 клиник и оптик по всему Казахстану.

--- СЕКРЕТНЫЕ СИСТЕМНЫЕ КОМАНДЫ (ДЛЯ БАЗЫ ДАННЫХ) ---
1. ПОДТВЕРЖДЕНИЕ ЗАПИСИ:
Когда пациент назвал Имя, Фамилию и согласился на конкретную Дату и Время (ты сверил это с занятым временем) — напиши обычный ответ, а В САМОМ КОНЦЕ сообщения (с новой строки) добавь скрытый код:
BOOKING_CONFIRMED: Имя|ГГГГ-ММ-ДД|ЧЧ:ММ

2. ОТМЕНА ЗАПИСИ:
Если пациент просит отменить существующую запись, уточни его Имя (если еще не знаешь). Когда назовет Имя, подтверди отмену и В САМОМ КОНЦЕ сообщения добавь скрытый код:
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
