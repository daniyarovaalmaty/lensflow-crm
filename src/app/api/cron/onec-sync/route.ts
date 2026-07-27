/**
 * 1C Sync Cron API Route
 * 
 * Triggers bidirectional sync between LensFlow and 1C:Бухгалтерия КЗ 3.0.
 * Can be called by Vercel Cron or manually via POST.
 * 
 * GET  /api/cron/onec-sync — run sync for all configured orgs
 * POST /api/cron/onec-sync — run sync with options { orgId?: string, direction?: 'pull'|'push'|'both' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createOneCClient, OneCSyncService } from '@/lib/integrations/onec';

export const maxDuration = 60; // Allow up to 60s for sync

export async function GET() {
  return runSync();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    return runSync(body.orgId, body.direction);
  } catch {
    return runSync();
  }
}

async function runSync(
  targetOrgId?: string,
  direction: 'pull' | 'push' | 'both' = 'both',
) {
  // Check 1C env vars
  if (!process.env.ONEC_BASE_URL || !process.env.ONEC_USERNAME || !process.env.ONEC_PASSWORD) {
    return NextResponse.json(
      { error: '1C integration not configured. Set ONEC_BASE_URL, ONEC_USERNAME, ONEC_PASSWORD.' },
      { status: 503 }
    );
  }

  const startTime = Date.now();
  const allResults: Record<string, unknown> = {};

  try {
    const client = createOneCClient();

    // Ping first
    const connected = await client.ping();
    if (!connected) {
      return NextResponse.json(
        { error: 'Cannot connect to 1C. Ping failed.' },
        { status: 502 }
      );
    }

    // Find organizations to sync
    // If targetOrgId specified, sync only that one
    // Otherwise, sync all orgs that have 1C metadata configured
    let orgIds: string[] = [];

    if (targetOrgId) {
      orgIds = [targetOrgId];
    } else {
      // Find orgs with 1C metadata or just use the first active org
      const orgs = await prisma.organization.findMany({
        where: {
          OR: [
            { metadata: { path: ['onec'], not: undefined } },
            { type: { in: ['headquarters', 'laboratory'] } },
          ],
        },
        select: { id: true, name: true },
        take: 10,
      });
      orgIds = orgs.map(o => o.id);
    }

    if (orgIds.length === 0) {
      return NextResponse.json({
        message: 'No organizations configured for 1C sync',
        duration: Date.now() - startTime,
      });
    }

    for (const orgId of orgIds) {
      const syncService = new OneCSyncService(client, prisma, orgId);

      try {
        let results;
        if (direction === 'pull') {
          results = await syncService.pullFromOneC();
        } else if (direction === 'push') {
          results = await syncService.pushToOneC();
        } else {
          results = await syncService.fullSync();
        }

        allResults[orgId] = results.map(r => ({
          entity: r.entity,
          created: r.created,
          updated: r.updated,
          errors: r.errors,
          skipped: r.skipped,
          durationMs: r.durationMs,
          details: r.details.slice(0, 10), // Limit detail output
        }));
      } catch (err) {
        allResults[orgId] = {
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    return NextResponse.json({
      success: true,
      direction,
      orgs: allResults,
      duration: Date.now() - startTime,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
