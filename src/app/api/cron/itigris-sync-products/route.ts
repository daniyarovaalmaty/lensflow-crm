export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ItigrisApiClient, ItigrisSyncService } from '@/lib/itigris';

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgs = await prisma.organization.findMany({ where: { status: 'active' } });
    const configured = orgs.filter((o: any) => {
        const i = o.metadata?.itigris;
        return i?.company && i?.login && i?.password;
    });

    const summary: any[] = [];
    for (const org of configured) {
        const cfg = (org as any).metadata.itigris;
        const client = new ItigrisApiClient({
            company: cfg.company, login: cfg.login, password: cfg.password,
            departmentId: Number(cfg.departmentId) || 0, organizationId: org.id,
        });
        const svc = new ItigrisSyncService(client, prisma as any, org.id);

        const t0 = Date.now();
        let results;
        try {
            results = [await svc.syncProducts()];
        } catch (e: any) {
            results = [{ entity: 'products', created: 0, updated: 0, errors: 1, details: [e.message] }];
        }

        const durationMs = Date.now() - t0;
        for (const r of results) {
            await prisma.itigrisSyncLog.create({
                data: {
                    organizationId: org.id, entity: r.entity, created: r.created,
                    updated: r.updated, errors: r.errors, details: r.details?.slice(0, 50) ?? [],
                    triggeredBy: 'cron', durationMs,
                },
            });
        }
        summary.push({
            orgId: org.id, durationMs,
            results: results.map((r: any) => ({ entity: r.entity, created: r.created, updated: r.updated, errors: r.errors })),
        });
    }
    return NextResponse.json({ ok: true, syncedAt: new Date().toISOString(), orgs: summary.length, summary });
}
