import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ----- POST: Actions -----
export async function POST(req: NextRequest) {
    // Безопасный перехват сессии для локальной разработки
    let session;
    let orgId;
    try {
        session = await auth();
        orgId = (session?.user as any)?.organizationId;
    } catch (e) {
        console.warn('Пропуск проверки сессии локально');
    }

    // Если локально сессии нет, даем тестовый ID
    if (!orgId && process.env.NODE_ENV === 'development') {
        orgId = "dev_test_organization_id";
    } else if (!orgId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action as string;

    // ----- Run Sync (Боевой запрос к демо API Итигриса) -----
    if (action === 'sync') {
        const baseUrl = process.env.ITIGRIS_URL || "https://optima.itigris.ru/optima_demo";
        const apiKey = process.env.ITIGRIS_API_KEY || "7ff4cc24fe7b4797fdce80b2bcfeac32";

        try {
            // Делаем реальный запрос к демо-базе Итигриса для поиска линз (как в доке)
            // Добавим фильтр dioptre=0.00, чтобы просто проверить связь
            const response = await fetch(`${baseUrl}/apiClInfo?key=${apiKey}&dioptre=0.00`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`Itigris API вернул статус: ${response.status}`);
            }

            // Читаем реальный ответ от Итигриса
            const itigrisData = await response.json();

            return NextResponse.json({
                ok: true,
                syncedAt: new Date().toISOString(),
                results: {
                    status: "success",
                    message: "Успешное подключение к API ITIGRIS (Живые данные)",
                    source: "optima.itigris.ru",
                    data: itigrisData // Тут прилетят реальные линзы или остатки из доки
                }
            });

        } catch (error: any) {
            console.error('Ошибка запроса к Itigris:', error);
            return NextResponse.json({ 
                error: `Не удалось связаться с ITIGRIS API: ${error.message}` 
            }, { status: 500 });
        }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// ----- GET: Connection Status -----
export async function GET() {
    return NextResponse.json({
        connected: true,
        company: process.env.ITIGRIS_COMPANY || "optima_demo",
        connectedAt: new Date().toISOString(),
    });
}