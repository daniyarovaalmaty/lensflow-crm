import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Ты — ИИ-помощник менеджера оптики. Твоя задача — парсить текстовые запросы менеджера и извлекать товары/услуги для добавления в каталог.

Менеджер может писать в свободной форме, например:
- "Добавь оправу Ray-Ban RB5228, закуп 15000, розница 25000"
- "Оправа Oakley OX8046 черная, закуп 12000, розница 20000, минимум на складе 3"
- "Проверка зрения стоит 3000 тенге"
- "Добавь контактные линзы Acuvue Oasys, упаковка 6 шт, закуп 8000, розница 14500"

Категории товаров:
- frame — Оправы
- sun_glasses — Солнцезащитные очки
- contact_lens — Контактные линзы
- spectacle_lens — Очковые линзы
- solution — Растворы для линз
- accessory — Аксессуары (чехлы, салфетки, цепочки)

Категории услуг:
- service_exam — Проверка зрения
- service_fitting — Подбор линз
- service_cutting — Вытачка / обработка линз
- service_repair — Ремонт очков
- service_other — Другие услуги

Ответь ТОЛЬКО валидным JSON-массивом товаров. Каждый товар:
{
  "name": "Полное название",
  "category": "код_категории",
  "brand": "Бренд или null",
  "model": "Модель или null",
  "sku": "Артикул или null",
  "shortDescription": "Краткое описание или null",
  "purchasePrice": число_или_0,
  "retailPrice": число_или_0,
  "minStock": число_или_0,
  "unit": "шт" или "упак" или "мл" или "пара",
  "trackSerials": true/false (true для оправ и солнцезащитных),
  "isPublic": false
}

Если не можешь определить категорию — по умолчанию "frame" для товаров, "service_other" для услуг.
Если цена не указана — ставь 0.
Если единица измерения не указана — "шт".
trackSerials = true для оправ и солнцезащитных очков, false для остального.

ВАЖНО: Ответь ТОЛЬКО JSON-массивом, без markdown, без объяснений.`;

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (!['optic_manager', 'lab_head', 'lab_admin'].includes(user.subRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { message } = await req.json();
    if (!message?.trim()) {
        return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    try {
        // Step 1: Parse with GPT
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: message },
            ],
            temperature: 0.1,
            max_tokens: 4000,
        });

        const raw = completion.choices[0]?.message?.content?.trim() || '[]';
        
        // Clean response — remove markdown code blocks if present
        let cleaned = raw;
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        let products: any[];
        try {
            products = JSON.parse(cleaned);
            if (!Array.isArray(products)) products = [products];
        } catch {
            return NextResponse.json({
                error: 'AI parse error',
                aiResponse: raw,
                message: 'Не удалось распарсить ответ ИИ. Попробуйте переформулировать.',
            }, { status: 422 });
        }

        if (products.length === 0) {
            return NextResponse.json({
                products: [],
                message: 'Не удалось определить товары из вашего текста. Попробуйте написать подробнее.',
            });
        }

        // Step 2: Create products in DB
        const created: any[] = [];
        const errors: string[] = [];

        for (const p of products) {
            try {
                const isService = String(p.category || '').startsWith('service_');
                const slug = (p.name || 'product')
                    .toLowerCase()
                    .replace(/[^\w\sа-яё-]/gi, '')
                    .replace(/\s+/g, '-')
                    .slice(0, 50);

                const product = await prisma.opticProduct.create({
                    data: {
                        organizationId: user.organizationId,
                        name: p.name || 'Без названия',
                        slug: `${slug}-${Date.now()}`,
                        category: p.category || (isService ? 'service_other' : 'frame'),
                        type: isService ? 'service' : 'product',
                        brand: p.brand || null,
                        model: p.model || null,
                        sku: p.sku || null,
                        shortDescription: p.shortDescription || null,
                        purchasePrice: Number(p.purchasePrice) || 0,
                        retailPrice: Number(p.retailPrice) || 0,
                        minStock: Number(p.minStock) || 0,
                        unit: p.unit || 'шт',
                        trackSerials: Boolean(p.trackSerials),
                        isPublic: Boolean(p.isPublic),
                        isActive: true,
                    },
                });
                created.push(product);
            } catch (err: any) {
                errors.push(`${p.name}: ${err.message}`);
            }
        }

        const summary = created.map(p => `✅ ${p.name} — ${p.retailPrice > 0 ? p.retailPrice.toLocaleString('ru-RU') + ' ₸' : 'цена не указана'}`).join('\n');
        const errorSummary = errors.length ? '\n\n⚠️ Ошибки:\n' + errors.join('\n') : '';

        return NextResponse.json({
            products: created,
            parsed: products.length,
            created: created.length,
            message: `Добавлено ${created.length} из ${products.length} позиций:\n${summary}${errorSummary}`,
        });

    } catch (err: any) {
        console.error('AI Catalog error:', err);
        if (err?.code === 'invalid_api_key' || err?.status === 401) {
            return NextResponse.json({
                error: 'OpenAI API key not configured',
                message: 'API-ключ OpenAI не настроен. Добавьте OPENAI_API_KEY в .env',
            }, { status: 500 });
        }
        return NextResponse.json({
            error: err.message,
            message: 'Ошибка ИИ. Попробуйте позже.',
        }, { status: 500 });
    }
}
