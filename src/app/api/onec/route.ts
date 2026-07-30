import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { OneCClient } from '@/lib/onec/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = (session.user as any).organizationId;
    if (!orgId) {
        return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action as string;

    // ----- Test Connection -----
    if (action === 'test') {
        const { baseUrl, username, password } = body;

        if (!baseUrl || !username || !password) {
            return NextResponse.json(
                { error: 'Заполните все поля: URL, логин и пароль' },
                { status: 400 }
            );
        }

        try {
            const client = new OneCClient({ baseUrl, username, password });
            // Проверка соединения OData: запрашиваем 1 товар
            await client.request<any>('Catalog_Номенклатура?$top=1');
            
            return NextResponse.json({ ok: true, message: 'Подключение успешно' });
        } catch (error: any) {
            return NextResponse.json({ ok: false, message: error.message || 'Сервер недоступен или неверные учетные данные' });
        }
    }

    // ----- Save Config -----
    if (action === 'save') {
        const { baseUrl, username, password } = body;

        if (!baseUrl || !username || !password) {
            return NextResponse.json(
                { error: 'Заполните все поля: URL, логин и пароль' },
                { status: 400 }
            );
        }

        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const existingMeta = (org as any)?.metadata || {};

        await prisma.organization.update({
            where: { id: orgId },
            data: {
                metadata: {
                    ...existingMeta,
                    onec: {
                        baseUrl,
                        username,
                        password,
                        connectedAt: new Date().toISOString(),
                    },
                },
            } as any,
        });

        return NextResponse.json({ ok: true, message: 'Настройки 1С сохранены' });
    }

    // ----- Disconnect -----
    if (action === 'disconnect') {
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const existingMeta = (org as any)?.metadata || {};
        
        if (existingMeta.onec) {
            delete existingMeta.onec;
        }

        await prisma.organization.update({
            where: { id: orgId },
            data: { metadata: existingMeta } as any,
        });

        return NextResponse.json({ ok: true, message: '1С отключена' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// ----- GET: Connection Status -----

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = (session.user as any).organizationId;
    if (!orgId) {
        return NextResponse.json({ connected: false });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const meta = (org as any)?.metadata || {};
    const onec = meta.onec;

    return NextResponse.json({
        connected: !!onec?.baseUrl,
        baseUrl: onec?.baseUrl || null,
        username: onec?.username || null,
        connectedAt: onec?.connectedAt || null,
    });
}
