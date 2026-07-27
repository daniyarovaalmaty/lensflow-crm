import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { OneCClient } from '@/lib/integrations/onec/client';

export const dynamic = 'force-dynamic';

async function getOrgConfig(orgId: string) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
    });

    if (!org) return null;

    const meta = (org as any).metadata || {};
    const onec = meta.onec;

    if (!onec?.baseUrl || !onec?.username || !onec?.password) return null;

    return {
        baseUrl: onec.baseUrl as string,
        username: onec.username as string,
        password: onec.password as string,
        exchangePlanName: onec.exchangePlanName as string,
        nodeCode: onec.nodeCode as string,
        organizationId: orgId,
    };
}

async function checkServiceStatus(baseUrl: string, username: string, password: string, serviceName: string) {
    const url = `${baseUrl}/ws/${serviceName}?wsdl`;
    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(url, {
            headers: { 'Authorization': authHeader },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        
        if (res.ok) {
            return { service: serviceName, status: 'ok' as const, message: 'Доступен' };
        }
        return { service: serviceName, status: 'error' as const, message: `HTTP ${res.status}` };
    } catch (err: any) {
        return { service: serviceName, status: 'error' as const, message: err.name === 'AbortError' ? 'Timeout' : err.message };
    }
}

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
            const isPingOk = await client.ping();
            
            if (isPingOk) {
                return NextResponse.json({ ok: true, message: 'Подключение успешно' });
            } else {
                return NextResponse.json({ ok: false, message: 'Сервер недоступен или неверные учетные данные' });
            }
        } catch (error: any) {
            return NextResponse.json({ ok: false, message: error.message });
        }
    }

    // ----- Save Config -----
    if (action === 'save') {
        const { baseUrl, username, password, exchangePlanName, nodeCode } = body;

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
                        exchangePlanName: exchangePlanName || '',
                        nodeCode: nodeCode || '',
                        connectedAt: new Date().toISOString(),
                    },
                },
            } as any,
        });

        return NextResponse.json({ ok: true, message: 'Настройки 1С сохранены' });
    }

    // ----- Get Plans -----
    if (action === 'plans') {
        const config = await getOrgConfig(orgId);
        if (!config) {
            return NextResponse.json({ error: '1C не подключен' }, { status: 400 });
        }

        try {
            const client = new OneCClient(config);
            const plansXml = await client.getExchangePlans();
            return NextResponse.json({ ok: true, plans: plansXml });
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
    }

    // ----- Status -----
    if (action === 'status') {
        const config = await getOrgConfig(orgId);
        if (!config) {
            return NextResponse.json({ error: '1C не подключен' }, { status: 400 });
        }

        const servicesToCheck = [
            'Exchange_3_0_2_1',
            'EnterpriseDataExchange_1_0_1_1',
            'EnterpriseDataUpload_1_0_1_1',
            'RemoteAdministrationOfExchange_2_0_1_6',
            'DataExchange',
            'InterfaceVersion'
        ];

        try {
            const results = await Promise.all(
                servicesToCheck.map(svc => checkServiceStatus(config.baseUrl, config.username, config.password, svc))
            );
            return NextResponse.json({ ok: true, services: results });
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
    }

    // ----- Sync (Placeholder) -----
    if (action === 'sync') {
        const { entity } = body;
        return NextResponse.json({
            ok: true,
            results: [
                {
                    entity: entity || 'unknown',
                    created: 0,
                    updated: 0,
                    errors: 0,
                    details: ['Функция синхронизации находится в разработке']
                }
            ]
        });
    }
    
    // ----- Disconnect -----
    if (action === 'disconnect') {
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const existingMeta = (org as any)?.metadata || {};
        delete existingMeta.onec;

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
        exchangePlanName: onec?.exchangePlanName || null,
        nodeCode: onec?.nodeCode || null,
        connectedAt: onec?.connectedAt || null,
    });
}
