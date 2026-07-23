/**
 * One-shot script: sync ALL products from ITIGRIS Optima into LensFlow.
 * Uses pg directly to avoid Prisma adapter issues with pgbouncer URLs.
 *
 * Usage:  npx tsx sync_products_now.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { ItigrisApiClient } from './src/lib/itigris/client';
import { ItigrisSyncService } from './src/lib/itigris/sync';

const ITIGRIS_COMPANY = 'optika_narodnaya';
const ITIGRIS_LOGIN = 'topmanager';
const ITIGRIS_PASSWORD = '987654321';

async function main() {
    // Use DIRECT_URL (port 5432, no pgbouncer) to avoid SCRAM auth issues
    const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL!;
    console.log('Connecting to DB...', connStr.replace(/:[^:@]+@/, ':***@'));

    const pool = new pg.Pool({
        connectionString: connStr,
        max: 5,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 20000,
        ssl: { rejectUnauthorized: false },
    });

    // Test raw connection first
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT 1 as ok');
        console.log('DB connection OK:', res.rows[0]);
        client.release();
    } catch (e: any) {
        console.error('DB connection failed:', e.message);
        await pool.end();
        return;
    }

    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    // 1. Find the organization
    const org = await prisma.organization.findFirst({
        where: {
            OR: [
                { name: { contains: 'Народная', mode: 'insensitive' } },
                { email: 'optika.narodnaya.astana@gmail.com' },
            ],
        },
    });

    if (!org) {
        console.error('Organization not found!');
        const orgs = await prisma.organization.findMany({ select: { id: true, name: true, email: true } });
        console.log('Available organizations:', JSON.stringify(orgs, null, 2));
        await prisma.$disconnect();
        await pool.end();
        return;
    }

    console.log(`Found organization: ${org.name} (${org.id})`);

    // 2. Create ITIGRIS API client with known departmentId
    const config = {
        company: ITIGRIS_COMPANY,
        login: ITIGRIS_LOGIN,
        password: ITIGRIS_PASSWORD,
        departmentId: 1000000001,
        organizationId: org.id,
    };

    const apiClient = new ItigrisApiClient(config);

    // 3. Test connection
    console.log('Testing ITIGRIS connection...');
    const test = await apiClient.testConnection();
    console.log(`Connection: ${test.ok ? 'OK' : 'FAIL'} - ${test.message}`);
    if (!test.ok) {
        await prisma.$disconnect();
        await pool.end();
        return;
    }

    // 4. List departments
    const departments = await apiClient.getDepartments();
    console.log(`\nDepartments found: ${departments.length}`);
    for (const d of departments) {
        console.log(`  - ${d.name} (id: ${d.id}, type: ${d.type})`);
    }

    // 5. Run the syncProducts method (V2 API)
    console.log('\nStarting product sync via V2 API...');
    const syncService = new ItigrisSyncService(apiClient, prisma as any, org.id);
    const result = await syncService.syncProducts();

    console.log('\n=== SYNC RESULT ===');
    console.log(`Entity: ${result.entity}`);
    console.log(`Created: ${result.created}`);
    console.log(`Updated: ${result.updated}`);
    console.log(`Errors: ${result.errors}`);
    console.log('Details:');
    for (const d of result.details) {
        console.log(`  ${d}`);
    }

    // 6. If V2 got 403, try Legacy RemoteAPI
    if (result.errors > 0 && result.created === 0 && result.updated === 0) {
        console.log('\nV2 API returned access denied. Trying Legacy RemoteAPI...');
        const meta = (org as any)?.metadata || {};
        const remoteConf = meta.itigrisRemote;
        if (remoteConf?.client && remoteConf?.key) {
            const { ItigrisRemoteClient } = await import('./src/lib/itigris/remote');
            const remoteClient = new ItigrisRemoteClient({ client: remoteConf.client, key: remoteConf.key });
            const legacyResult = await syncService.syncProductsLegacy(remoteClient);
            console.log('\n=== LEGACY SYNC RESULT ===');
            console.log(`Created: ${legacyResult.created}`);
            console.log(`Updated: ${legacyResult.updated}`);
            console.log(`Errors: ${legacyResult.errors}`);
            for (const d of legacyResult.details) {
                console.log(`  ${d}`);
            }
        } else {
            console.log('No RemoteAPI key configured.');
        }
    }

    // 7. Show final product count
    const productCount = await (prisma as any).opticProduct.count({
        where: { organizationId: org.id },
    });
    console.log(`\nTotal products in LensFlow for "${org.name}": ${productCount}`);

    await prisma.$disconnect();
    await pool.end();
}

main().catch(async (e) => {
    console.error('Fatal error:', e);
    process.exit(1);
});
