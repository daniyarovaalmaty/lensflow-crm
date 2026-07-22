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
        const organizations = await prisma.organization.findMany();
        const configuredOrgs = organizations.filter(org => {
            if (!org.metadata) return false;
            const meta = typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata;
            return !!meta?.itigris?.company;
        });

        if (configuredOrgs.length === 0) {
            return NextResponse.json({ message: 'No Itigris configs found' });
        }

        const results = [];
        for (const org of configuredOrgs) {
            const meta = typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata;
            const config = meta.itigris;
            
            const { ItigrisApiClient } = await import('@/lib/itigris/client');
            const itigrisApi = new ItigrisApiClient({
                company: config.company,
                login: config.login,
                password: config.password,
                departmentId: config.departmentId,
                organizationId: org.id
            });
            const syncService = new ItigrisSyncService(itigrisApi, prisma as any, org.id);
            const since = new Date();
            since.setDate(since.getDate() - 1);
            
            console.log(`[CRON] Starting sync for organization ${org.name}`);
            
            // 1. Sync Patients
            console.log(`[CRON] Syncing Patients...`);
            const patientsResult = await syncService.syncPatients(since);
            
            // 2. Sync Products
            console.log(`[CRON] Syncing Products...`);
            const productsResult = await syncService.syncProducts();
            
            // 3. Sync Orders
            console.log(`[CRON] Syncing Orders...`);
            const ordersResult = await syncService.syncOrders({ skipExisting: false });
            
            results.push({
                organizationId: org.id,
                name: org.name,
                patients: patientsResult,
                products: productsResult,
                orders: ordersResult
            });
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('[CRON] Error during Itigris sync:', error);
        return NextResponse.json({ error: 'Sync failed', details: error.message }, { status: 500 });
    }
}
