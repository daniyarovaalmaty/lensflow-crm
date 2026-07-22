import { NextRequest, NextResponse } from 'next/server';
import { ItigrisSyncService } from '@/lib/itigris/sync';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // Basic security for cron (Vercel provides CRON_SECRET or just a custom token)
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Find the specific organization for synchronization.
        // As a simple start, we can sync the first organization that has an Itigris configuration.
        // We look for any Itigris config. If there are multiple optics, we would loop through them.
        const opticsConfigs = await prisma.itigrisConfig.findMany({
            include: {
                organization: true
            }
        });

        if (opticsConfigs.length === 0) {
            return NextResponse.json({ message: 'No Itigris configs found' });
        }

        const results = [];
        for (const config of opticsConfigs) {
            if (!config.organization) continue;
            
            const syncService = new ItigrisSyncService(config.organizationId);
            
            // Sync orders created/updated recently (e.g. last 1 days)
            const since = new Date();
            since.setDate(since.getDate() - 1);
            
            console.log(`[CRON] Starting sync for organization ${config.organization.name}`);
            const result = await syncService.syncOrders(since);
            
            results.push({
                organizationId: config.organizationId,
                name: config.organization.name,
                result
            });
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('[CRON] Error during Itigris sync:', error);
        return NextResponse.json({ error: 'Sync failed', details: error.message }, { status: 500 });
    }
}
