export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import OpenAI from 'openai';
import { handleWhatsAppBot } from '@/lib/whatsapp-bot';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GREEN_API_BASE = 'https://api.green-api.com';
const INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID;
const TOKEN = process.env.GREEN_API_TOKEN;

async function sendWhatsApp(phone: string, message: string): Promise<void> {
    if (!INSTANCE_ID || !TOKEN) return;
    const chatId = `${phone.replace(/\D/g, '')}@c.us`;
    await fetch(`${GREEN_API_BASE}/waInstance${INSTANCE_ID}/sendMessage/${TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
    });
}

/**
 * GET /api/cron/bot-followup
 * Run this endpoint via a cron job (e.g. Vercel Cron or GitHub Actions) every hour.
 */
export async function GET() {
    // Only process sessions that are not done/paused
    const activeSessions = await prisma.botSession.findMany({
        where: {
            state: { notIn: ['done', 'paused'] },
        }
    });

    const now = new Date().getTime();
    let remindersSent = 0;

    for (const session of activeSessions) {
        const timeSinceLastUpdateMs = now - session.updatedAt.getTime();
        const hoursPassed = timeSinceLastUpdateMs / (1000 * 60 * 60);
        
        let shouldRemind = false;
        let followUpText = '';

        // 1. Remind after 4 hours if no reply today
        if (hoursPassed >= 4 && hoursPassed < 24 && session.followUpCount === 0) {
            shouldRemind = true;
            followUpText = `Здравствуйте! Вы хотели записаться к нам на прием, но мы так и не выбрали удобное время. Подсказать вам ближайшие свободные окошки? 🕰️`;
            await prisma.botSession.update({ where: { id: session.id }, data: { followUpCount: 1 } });
        }
        // 2. Remind after 2 days (48 hours)
        else if (hoursPassed >= 48 && hoursPassed < 72 && session.followUpCount === 1) {
            shouldRemind = true;
            followUpText = `Добрый день! 👋 Это снова администратор клиники New EYE. Хочу напомнить, что мы все еще ждем вас на бесплатную консультацию. Зрение ребенка — это важно, не откладывайте! Записать вас на эту неделю?`;
            await prisma.botSession.update({ where: { id: session.id }, data: { followUpCount: 2 } });
        }
        // 3. Remind after 7 days (168 hours)
        else if (hoursPassed >= 168 && hoursPassed < 192 && session.followUpCount === 2) {
            shouldRemind = true;
            followUpText = `Здравствуйте! Неделю назад вы интересовались коррекцией зрения в нашей клинике. Если у вас появились вопросы или сомнения — буду рад(а) ответить! Если хотите записаться — просто напишите удобный день.`;
            await prisma.botSession.update({ where: { id: session.id }, data: { followUpCount: 3 } });
        }
        // 4. Remind after 30 days (720 hours)
        else if (hoursPassed >= 720 && hoursPassed < 744 && session.followUpCount === 3) {
            shouldRemind = true;
            followUpText = `Добрый день! Месяц назад мы с вами общались по поводу диагностики зрения. Напоминаю, что зрение нужно проверять регулярно. Приглашаем вас на профилактический осмотр! 🏥`;
            await prisma.botSession.update({ where: { id: session.id }, data: { followUpCount: 4, state: 'paused' } }); // pause after last reminder
        }

        if (shouldRemind && followUpText) {
            try {
                // Send via WhatsApp
                await sendWhatsApp(session.phone, followUpText);
                
                // Add to history so GPT knows it sent a reminder
                const history: any[] = Array.isArray(session.history) ? session.history : [];
                history.push({ role: 'assistant', content: followUpText });
                
                await prisma.botSession.update({
                    where: { id: session.id },
                    data: { history: history.slice(-20) } // keep short
                });
                
                // Save ChatMessage
                if (session.leadId) {
                    await prisma.chatMessage.create({
                        data: {
                            leadId: session.leadId,
                            direction: 'outgoing',
                            content: followUpText,
                            channel: 'whatsapp',
                            status: 'sent',
                        }
                    });
                }
                
                remindersSent++;
            } catch (err) {
                console.error(`[FollowUp Error] for ${session.phone}:`, err);
            }
        }
    }

    return NextResponse.json({ ok: true, remindersSent });
}
