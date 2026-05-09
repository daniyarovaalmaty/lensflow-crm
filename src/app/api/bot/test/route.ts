export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import OpenAI from 'openai';
import prisma from '@/lib/db/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, history = [] } = await req.json();

  // Load bot config
  const configs = await prisma.botConfig.findMany();
  const cfg: Record<string, string> = {};
  for (const c of configs) cfg[c.key] = c.value;

  const systemPrompt = buildSystemPrompt(cfg);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 400,
    temperature: 0.7,
  });

  const reply = completion.choices[0]?.message?.content || 'Ошибка ответа';

  return NextResponse.json({ reply });
}

function buildSystemPrompt(cfg: Record<string, string>): string {
  return `Ты — ИИ-ассистент клиники ${cfg.clinic_name || 'New EYE'}.
Стиль общения: ${cfg.bot_tone || 'дружелюбный, профессиональный, на "вы"'}

ИНФОРМАЦИЯ О КЛИНИКЕ:
📍 Адрес: ${cfg.address || 'уточняйте у администратора'}
🕐 Часы работы: ${cfg.working_hours || 'Пн-Сб 9:00-19:00'}
👨‍⚕️ Врачи: ${cfg.doctors || 'наши специалисты'}
📱 Контакт: ${cfg.phone_contact || 'этот WhatsApp'}

УСЛУГИ И ЦЕНЫ:
${cfg.services || ''}

${cfg.prices || ''}

ОБ ОРТО-К ЛИНЗАХ:
${cfg.ortho_k_info || ''}

ЧАСТЫЕ ВОПРОСЫ:
${cfg.faq || ''}

${cfg.extra_rules ? 'ДОПОЛНИТЕЛЬНО:\n' + cfg.extra_rules : ''}

ПРАВИЛА:
- Общайся на русском языке
- Отвечай кратко и по делу (2-4 предложения)
- Когда пациент хочет записаться — собери: имя, удобную дату и время
- После подтверждения записи выведи: BOOKING_CONFIRMED: Имя|ГГГГ-ММ-ДД|ЧЧ:ММ
- НЕ придумывай цены и медицинские данные которых нет выше`;
}
