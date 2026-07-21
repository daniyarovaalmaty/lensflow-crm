import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
    const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL!;
    const pool = new pg.Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const orgId = 'cmowv0aio000204la3rf3ff0f';

    // 1. Products created per 10-min window
    const timeline = await (prisma as any).$queryRaw`
        SELECT 
            date_trunc('hour', "createdAt") + 
            (EXTRACT(minute FROM "createdAt")::int / 10) * interval '10 min' as time_bucket,
            COUNT(*)::int as cnt
        FROM optic_products 
        WHERE "organizationId" = ${orgId}
        GROUP BY time_bucket
        ORDER BY time_bucket
    `;
    console.log('=== CREATION TIMELINE (10-min windows) ===');
    for (const row of timeline as any[]) {
        const bar = '█'.repeat(Math.min(Math.round((row.cnt as number) / 100), 50));
        console.log(`${new Date(row.time_bucket).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Aqtobe' })} | ${String(row.cnt).padStart(5)} | ${bar}`);
    }

    // 2. Total & newest
    const total = await (prisma as any).opticProduct.count({ where: { organizationId: orgId } });
    const newest = await (prisma as any).opticProduct.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, name: true, specs: true },
    });
    const newestCat = newest?.specs?.itigrisCategory || 'unknown';
    console.log(`\nTotal: ${total}`);
    console.log(`Newest: ${newest?.createdAt} | ${newest?.name} | category: ${newestCat}`);

    // 3. Count by itigris category
    const byCat = await (prisma as any).$queryRaw`
        SELECT specs->>'itigrisCategory' as cat, COUNT(*)::int as cnt
        FROM optic_products 
        WHERE "organizationId" = ${orgId} AND specs->>'source' = 'itigris'
        GROUP BY cat
        ORDER BY cnt DESC
    `;
    console.log('\n=== BY ITIGRIS CATEGORY ===');
    for (const row of byCat as any[]) {
        console.log(`  ${row.cat}: ${row.cnt}`);
    }

    // 4. Check sync logs
    const logs = await (prisma as any).itigrisSyncLog.findMany({
        where: { organizationId: orgId },
        orderBy: { syncedAt: 'desc' },
        take: 5,
    });
    console.log('\n=== SYNC LOGS ===');
    if (logs.length === 0) {
        console.log('No sync logs found');
    } else {
        for (const l of logs as any[]) {
            console.log(`${l.syncedAt} | ${l.entity} | created:${l.created} updated:${l.updated} errors:${l.errors}`);
        }
    }

    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
