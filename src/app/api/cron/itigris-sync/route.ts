export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ItigrisApiClient, ItigrisSyncService } from '@/lib/itigris';

/**
 * GET /api/cron/itigris-sync — scheduled two-way ITIGRIS sync.
 * Run via cron (Vercel Cron / external scheduler). ITIGRIS has no webhooks,
 * so inbound sync is polling-based.
 *
 * Query:
 *   ?entity=clients|orders|full  (default: clients — incremental & fast)
 *   ?orgId=...                   (optional: sync a single org)
 *
 * Clients use an incremental delta (since = last successful sync); orders are a
 * full sweep (slow ~minutes), so schedule entity=orders/full less frequently.
 * Each run writes an ItigrisSyncLog row per entity.
 */
export async function GET(req: NextRequest) {
    // Optional shared-secret guard (set CRON_SECRET to require it).
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entity = (searchParams.get('entity') || 'clients') as 'clients' | 'orders' | 'full';
    const onlyOrgId = searchParams.get('orgId');

    // Find orgs that have an ITIGRIS config (filter in code — metadata is JSON).
    const orgs = await prisma.organization.findMany({
        where: onlyOrgId ? { id: onlyOrgId } : { status: 'active' },
    });
    const configured = orgs.filter((o: any) => {
        const i = o.metadata?.itigris;
        return i?.company && i?.login && i?.password;
    });

    const summary: any[] = [];

    for (const org of configured) {
        const cfg = (org as any).metadata.itigris;
        const client = new ItigrisApiClient({
            company: cfg.company,
            login: cfg.login,
            password: cfg.password,
            departmentId: Number(cfg.departmentId) || 0,
            organizationId: org.id,
        });
        const svc = new ItigrisSyncService(client, prisma as any, org.id);

        // Incremental clients: use the last successful sync time as `since`.
        const lastLog = await prisma.itigrisSyncLog.findFirst({
            where: { organizationId: org.id, errors: 0, entity: { in: ['clients', 'full'] } },
            orderBy: { syncedAt: 'desc' },
        });
        const since = entity !== 'orders' ? lastLog?.syncedAt?.toISOString() : undefined;

        const t0 = Date.now();
        let results;
        try {
            if (entity === 'orders') results = [await svc.syncOrders()];
            else if (entity === 'full') results = await svc.fullSync(since);
            else results = [await svc.syncClientChanges(since)];
        } catch (e: any) {
            results = [{ entity, created: 0, updated: 0, errors: 1, details: [e.message] }];
        }

        const durationMs = Date.now() - t0;
        for (const r of results) {
            await prisma.itigrisSyncLog.create({
                data: {
                    organizationId: org.id,
                    entity: r.entity,
                    created: r.created,
                    updated: r.updated,
                    errors: r.errors,
                    details: r.details?.slice(0, 50) ?? [],
                    triggeredBy: 'cron',
                    durationMs,
                },
            });
        }
        summary.push({
            orgId: org.id,
            durationMs,
            results: results.map((r) => ({ entity: r.entity, created: r.created, updated: r.updated, errors: r.errors })),
        });
    }

    return NextResponse.json({ ok: true, syncedAt: new Date().toISOString(), orgs: summary.length, summary });
}
