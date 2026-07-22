import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ItigrisApiClient, ItigrisSyncService } from '@/lib/itigris';

export const maxDuration = 300; // Allow up to 5 mins on Vercel Pro
export const dynamic = 'force-dynamic'; // Prevent static caching

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        // Validate CRON_SECRET unless in development environment
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== 'development') {
            return new Response('Unauthorized', { status: 401 });
        }

        const orgs = await prisma.organization.findMany();
        const results = [];

        for (const org of orgs) {
            const itigris = (org.metadata as any)?.itigris;
            if (itigris?.company && itigris?.login && itigris?.password && itigris?.syncEnabled !== false) {
                try {
                    console.log(`[Cron] Starting Itigris Sync for org ${org.id}`);
                    const client = new ItigrisApiClient({
                        company: itigris.company,
                        login: itigris.login,
                        password: itigris.password,
                        departmentId: Number(itigris.departmentId) || 0,
                        organizationId: org.id
                    });
                    
                    const svc = new ItigrisSyncService(client, prisma as any, org.id);
                    
                    // Run sync operations sequentially to avoid overwhelming the external API
                    await svc.syncClientChanges();
                    await svc.syncOrders();
                    await svc.syncProducts();
                    
                    results.push({ orgId: org.id, status: 'success' });
                } catch (e) {
                    console.error(`[Cron] Sync failed for org ${org.id}`, e);
                    results.push({ orgId: org.id, status: 'error', error: String(e) });
                }
            }
        }

        return NextResponse.json({ success: true, timestamp: new Date().toISOString(), results });
    } catch (e) {
        console.error('[Cron] Itigris cron failed entirely:', e);
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}
