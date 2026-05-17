/**
 * ITIGRIS Integration API Routes
 *
 * POST /api/itigris — Actions: test, save, sync, disconnect
 * GET  /api/itigris — Get connection status
 *
 * Auth: company + login + password + departmentId (ITIGRIS Optima v.2 API)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { ItigrisApiClient, ItigrisSyncService } from '@/lib/itigris';

async function getOrgConfig(orgId: string) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
    });

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

// ----- POST: Actions -----

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
        const { company, login, password, departmentId } = body;

        if (!company || !login || !password) {
            return NextResponse.json(
                { error: 'Заполните все поля: приложение, логин и пароль' },
                { status: 400 }
            );
        }

        const client = new ItigrisApiClient({
            company,
            login,
            password,
            departmentId: Number(departmentId) || 0,
            organizationId: orgId,
        });

        const result = await client.testConnection();
        return NextResponse.json(result);
    }

    // ----- Save Config -----
    if (action === 'save') {
        const { company, login, password, departmentId } = body;

        if (!company || !login || !password) {
            return NextResponse.json(
                { error: 'Заполните все поля: приложение, логин и пароль' },
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
                    itigris: {
                        company,
                        login,
                        password,
                        departmentId: Number(departmentId) || 0,
                        connectedAt: new Date().toISOString(),
                    },
                },
            } as any,
        });

        return NextResponse.json({ ok: true, message: 'Настройки ITIGRIS сохранены' });
    }

    // ----- Run Sync -----
    if (action === 'sync') {
        const config = await getOrgConfig(orgId);
        if (!config) {
            return NextResponse.json(
                { error: 'ITIGRIS не подключен. Сохраните настройки.' },
                { status: 400 }
            );
        }

        const client = new ItigrisApiClient(config);
        const syncService = new ItigrisSyncService(client, prisma as any, orgId);

        const since = body.since as string | undefined;
        const results = await syncService.fullSync(since);

        return NextResponse.json({
            ok: true,
            results,
            syncedAt: new Date().toISOString(),
        });
    }

    // ----- Disconnect -----
    if (action === 'disconnect') {
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const existingMeta = (org as any)?.metadata || {};
        delete existingMeta.itigris;

        await prisma.organization.update({
            where: { id: orgId },
            data: { metadata: existingMeta } as any,
        });

        return NextResponse.json({ ok: true, message: 'ITIGRIS отключён' });
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
    const itigris = meta.itigris;

    return NextResponse.json({
        connected: !!itigris?.company,
        company: itigris?.company || null,
        login: itigris?.login || null,
        connectedAt: itigris?.connectedAt || null,
    });
}
