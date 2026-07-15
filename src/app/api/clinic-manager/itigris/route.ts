import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { ItigrisApiClient, ItigrisSyncService, ItigrisLegacyClient, ItigrisRemoteClient } from '@/lib/itigris';

export const dynamic = 'force-dynamic';

async function getOrgConfig(orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return null;
    const meta = (org as any).metadata || {};
    const itigris = meta.itigris;
    if (!itigris?.company || !itigris?.login || !itigris?.password) return null;
    return {
        company: itigris.company as string,
        login: itigris.login as string,
        password: itigris.password as string,
        departmentId: Number(itigris.departmentId) || 0,
        organizationId: orgId,
    };
}

export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = (session.user as any).organizationId;
    if (!orgId) return NextResponse.json({ connected: false, syncLogs: [] });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const meta = (org as any)?.metadata || {};
    const itigris = meta.itigris;

    const syncLogs = await (prisma as any).itigrisSyncLog.findMany({
        where: { organizationId: orgId },
        orderBy: { syncedAt: 'desc' },
        take: 20,
    });

    const patientsCount = await (prisma as any).patient.count({
        where: { organizationId: orgId, externalSource: 'itigris' },
    });

    const ordersCount = await (prisma as any).order.count({
        where: { organizationId: orgId, source: 'itigris' },
    });

    return NextResponse.json({
        connected: !!itigris?.company,
        company: itigris?.company || null,
        login: itigris?.login || null,
        connectedAt: itigris?.connectedAt || null,
        departmentId: itigris?.departmentId || null,
        legacyClient: meta.itigrisLegacy?.client || null,
        legacyConnected: !!meta.itigrisLegacy?.key,
        remoteConnected: !!meta.itigrisRemote?.key,
        syncLogs,
        stats: { patientsCount, ordersCount },
    });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = (session.user as any).organizationId;
    const userId = (session.user as any).id;
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json();
    const action = body.action as string;

    if (action === 'test') {
        const { company, login, password, departmentId } = body;
        if (!company || !login || !password) {
            return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
        }
        const client = new ItigrisApiClient({ company, login, password, departmentId: Number(departmentId) || 0, organizationId: orgId });
        const result = await client.testConnection();
        return NextResponse.json(result);
    }

    if (action === 'save') {
        const { company, login, password, departmentId } = body;
        if (!company || !login || !password) {
            return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
        }
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const existingMeta = (org as any)?.metadata || {};
        await prisma.organization.update({
            where: { id: orgId },
            data: {
                metadata: {
                    ...existingMeta,
                    itigris: { company, login, password, departmentId: Number(departmentId) || 0, connectedAt: new Date().toISOString() },
                },
            } as any,
        });
        return NextResponse.json({ ok: true, message: 'Настройки ITIGRIS сохранены' });
    }

    if (action === 'sync' || action === 'sync_delta') {
        const config = await getOrgConfig(orgId);
        if (!config) return NextResponse.json({ error: 'ITIGRIS не подключен' }, { status: 400 });

        const since = action === 'sync_delta' ? body.since : undefined;
        const startMs = Date.now();
        const client = new ItigrisApiClient(config);
        const syncService = new ItigrisSyncService(client, prisma as any, orgId);

        const results = await syncService.fullSync(since);
        const durationMs = Date.now() - startMs;

        const totalCreated = results.reduce((s, r) => s + r.created, 0);
        const totalUpdated = results.reduce((s, r) => s + r.updated, 0);
        const totalErrors = results.reduce((s, r) => s + r.errors, 0);

        await (prisma as any).itigrisSyncLog.create({
            data: {
                organizationId: orgId,
                entity: 'full',
                created: totalCreated,
                updated: totalUpdated,
                errors: totalErrors,
                details: results,
                triggeredBy: userId || 'manual',
                durationMs,
            },
        });

        return NextResponse.json({ ok: true, results, syncedAt: new Date().toISOString(), durationMs });
    }

    if (action === 'disconnect') {
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const existingMeta = (org as any)?.metadata || {};
        delete existingMeta.itigris;
        await prisma.organization.update({ where: { id: orgId }, data: { metadata: existingMeta } as any });
        return NextResponse.json({ ok: true, message: 'ITIGRIS отключён' });
    }

    if (action === 'test_legacy') {
        const { legacyClient, legacyKey } = body;
        const client = new ItigrisLegacyClient({ client: legacyClient, key: legacyKey });
        const result = await client.test();
        return NextResponse.json({ ok: result.ok, message: result.ok ? 'Подключено успешно (Legacy)' : result.message });
    }

    if (action === 'save_legacy') {
        const { legacyClient, legacyKey } = body;
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const existingMeta = (org as any)?.metadata || {};
        await prisma.organization.update({
            where: { id: orgId },
            data: { metadata: { ...existingMeta, itigrisLegacy: { client: legacyClient, key: legacyKey } } } as any,
        });
        return NextResponse.json({ ok: true, message: 'Легаси настройки сохранены' });
    }

    if (action === 'test_remote') {
        const { remoteClient, remoteKey } = body;
        const client = new ItigrisRemoteClient({ client: remoteClient, key: remoteKey });
        const result = await client.test();
        return NextResponse.json({ ok: result.ok, message: result.ok ? 'Подключено успешно (RemoteAPI)' : result.message });
    }

    if (action === 'save_remote') {
        const { remoteClient, remoteKey } = body;
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const existingMeta = (org as any)?.metadata || {};
        await prisma.organization.update({
            where: { id: orgId },
            data: { metadata: { ...existingMeta, itigrisRemote: { client: remoteClient, key: remoteKey } } } as any,
        });
        return NextResponse.json({ ok: true, message: 'RemoteAPI настройки сохранены' });
    }

    if (action === 'sync_products_legacy') {
        // Just reuse the normal product sync which now uses RemoteClient under the hood if available
        const config = await getOrgConfig(orgId);
        if (!config) return NextResponse.json({ error: 'ITIGRIS не подключен' }, { status: 400 });
        
        const client = new ItigrisApiClient(config);
        const syncService = new ItigrisSyncService(client, prisma as any, orgId);
        const results = await syncService.syncProducts();
        return NextResponse.json({ ok: true, results, syncedAt: new Date().toISOString() });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
