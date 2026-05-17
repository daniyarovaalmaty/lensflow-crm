/**
 * ITIGRIS Integration API Routes
 *
 * POST /api/itigris/test     — Test connection to ITIGRIS
 * POST /api/itigris/sync     — Run full sync
 * GET  /api/itigris/status   — Get sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';
import { ItigrisApiClient, ItigrisSyncService } from '@/lib/itigris';

async function getOrgConfig(orgId: string) {
    // Read ITIGRIS config from organization settings
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
    });

    if (!org) return null;

    // ITIGRIS config stored in organization metadata
    const meta = (org as any).metadata || {};
    const itigris = meta.itigris;

    if (!itigris?.baseUrl || !itigris?.apiToken) return null;

    return {
        baseUrl: itigris.baseUrl as string,
        apiToken: itigris.apiToken as string,
        organizationId: orgId,
        branchId: itigris.branchId as string | undefined,
    };
}

// Test ITIGRIS connection
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
        const baseUrl = body.baseUrl as string;
        const apiToken = body.apiToken as string;

        if (!baseUrl || !apiToken) {
            return NextResponse.json(
                { error: 'Укажите URL и токен ITIGRIS' },
                { status: 400 }
            );
        }

        const client = new ItigrisApiClient({
            baseUrl,
            apiToken,
            organizationId: orgId,
        });

        const result = await client.testConnection();
        return NextResponse.json(result);
    }

    // ----- Save Config -----
    if (action === 'save') {
        const baseUrl = body.baseUrl as string;
        const apiToken = body.apiToken as string;
        const branchId = body.branchId as string | undefined;

        if (!baseUrl || !apiToken) {
            return NextResponse.json(
                { error: 'Укажите URL и токен ITIGRIS' },
                { status: 400 }
            );
        }

        // Save to organization metadata
        const org = await prisma.organization.findUnique({ where: { id: orgId } });
        const existingMeta = (org as any)?.metadata || {};

        await prisma.organization.update({
            where: { id: orgId },
            data: {
                metadata: {
                    ...existingMeta,
                    itigris: { baseUrl, apiToken, branchId, connectedAt: new Date().toISOString() },
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

        const updatedAfter = body.updatedAfter as string | undefined;
        const results = await syncService.fullSync(updatedAfter);

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

// Get ITIGRIS connection status
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
        connected: !!itigris?.apiToken,
        baseUrl: itigris?.baseUrl || null,
        connectedAt: itigris?.connectedAt || null,
    });
}
