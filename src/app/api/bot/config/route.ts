export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

// Default bot config fields
const DEFAULTS = [
  { key: 'clinic_name',    label: 'Название клиники',        category: 'general',   value: 'New EYE — офтальмологический центр' },
  { key: 'address',        label: 'Адрес клиники',           category: 'general',   value: 'г. Алматы, уточняйте у администратора' },
  { key: 'working_hours',  label: 'Режим работы',            category: 'general',   value: 'Понедельник–Суббота: 9:00–19:00. Воскресенье — выходной.' },
  { key: 'phone_contact',  label: 'Телефон / WhatsApp',      category: 'general',   value: 'Этот номер WhatsApp' },
  { key: 'doctors',        label: 'Врачи клиники',           category: 'general',   value: 'Айгерим Аскарова — главный врач-офтальмолог. Запись ведётся к нашим специалистам.' },
  { key: 'greeting',       label: 'Приветственное сообщение',category: 'general',   value: 'Здравствуйте! Я ИИ-ассистент клиники New EYE. Чем могу помочь?' },
  { key: 'services',       label: 'Услуги клиники',          category: 'services',  value: '• Ортокератология (орто-К ночные линзы) — коррекция миопии без операции\n• Детская офтальмология\n• Подбор контактных линз\n• Проверка зрения\n• Лечение амблиопии' },
  { key: 'prices',         label: 'Цены',                    category: 'services',  value: '• Консультация офтальмолога — БЕСПЛАТНО\n• Орто-К линзы — от 150 000 тг (зависит от параметров)\n• Контактные линзы — от 5 000 тг\n• Подбор линз — входит в стоимость' },
  { key: 'ortho_k_info',   label: 'Об орто-К линзах',        category: 'services',  value: 'Ортокератологические (орто-К) линзы — ночные жёсткие линзы, которые надеваются на ночь и мягко исправляют форму роговицы. После снятия ребёнок видит весь день без очков и линз. Подходят для детей с 6 лет с миопией до -6 диоптрий. Замедляют прогрессирование близорукости на 50-70%.' },
  { key: 'faq',            label: 'Частые вопросы (FAQ)',    category: 'faq',       value: 'В: Сколько стоит консультация?\nО: Первичная консультация бесплатна.\n\nВ: С какого возраста можно носить орто-К линзы?\nО: С 6 лет, при наличии показаний врача.\n\nВ: Как долго нужно носить орто-К линзы?\nО: Каждую ночь, пока нужен эффект коррекции.\n\nВ: Есть ли противопоказания?\nО: Да, определяются на консультации офтальмолога.\n\nВ: Как записаться?\nО: Напишите нам в WhatsApp или позвоните.' },
  { key: 'bot_tone',       label: 'Стиль общения бота',      category: 'general',   value: 'Дружелюбный, профессиональный, заботливый. Используй простые слова, избегай сложных медицинских терминов без объяснений. Обращайся на "вы".' },
  { key: 'extra_rules',    label: 'Дополнительные правила',  category: 'general',   value: '' },
];

// GET — load all config (create defaults if missing)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Upsert defaults
  for (const d of DEFAULTS) {
    await prisma.botConfig.upsert({
      where: { key: d.key },
      create: d,
      update: { label: d.label, category: d.category }, // don't overwrite user's value
    });
  }

  const configs = await prisma.botConfig.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(configs);
}

// PATCH — update one config field
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const updated = await prisma.botConfig.update({
    where: { key },
    data: { value },
  });
  return NextResponse.json(updated);
}
