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

    const orgId = 'cmowv0aio000204la3rf3ff0f'; // Оптика Народная

    // 1. When were products created?
    const oldest = await (prisma as any).opticProduct.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, name: true, sku: true },
    });
    const newest = await (prisma as any).opticProduct.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, name: true, sku: true },
    });
    console.log('=== TIMING ===');
    console.log('Oldest product:', oldest?.createdAt, oldest?.name, oldest?.sku);
    console.log('Newest product:', newest?.createdAt, newest?.name, newest?.sku);

    // 2. Check specs.source breakdown
    const allProducts = await (prisma as any).opticProduct.findMany({
        where: { organizationId: orgId },
        select: { specs: true },
        take: 100,
    });
    const sources: Record<string, number> = {};
    for (const p of allProducts) {
        const src = p.specs?.source || 'unknown';
        sources[src] = (sources[src] || 0) + 1;
    }
    console.log('\n=== SOURCES (sample 100) ===');
    console.log(sources);

    // 3. Check if specs contain departmentId
    const withDept = await (prisma as any).opticProduct.findMany({
        where: { organizationId: orgId },
        select: { specs: true, name: true, sku: true, currentStock: true },
        take: 5,
    });
    console.log('\n=== SAMPLE SPECS (first 5) ===');
    for (const p of withDept) {
        console.log(`${p.name} (${p.sku}): stock=${p.currentStock}`);
        console.log('  specs:', JSON.stringify(p.specs, null, 2));
    }

    // 4. Check sync logs
    try {
        const logs = await (prisma as any).itigrisSyncLog.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: { id: true, createdAt: true, action: true, results: true },
        });
        console.log('\n=== SYNC LOGS ===');
        for (const l of logs) {
            console.log(`${l.createdAt} | ${l.action} | ${JSON.stringify(l.results)?.substring(0, 200)}`);
        }
    } catch {
        console.log('\n=== NO SYNC LOGS TABLE OR NO DATA ===');
    }

    // 5. Check org metadata for itigris config
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, metadata: true },
    });
    const meta = (org as any)?.metadata;
    console.log('\n=== ORG METADATA (itigris keys) ===');
    console.log('itigris:', meta?.itigris ? `login=${meta.itigris.login}, company=${meta.itigris.company}, dept=${meta.itigris.departmentId}` : 'NOT SET');
    console.log('itigrisRemote:', meta?.itigrisRemote ? `client=${meta.itigrisRemote.client}, key=${meta.itigrisRemote.key?.substring(0, 8)}...` : 'NOT SET');

    // 6. Check the 3 city orgs
    for (const cityOrgId of ['cmppqdyy7000104gshlynzaw6', 'cmppqdn94000004gs8rwc1upr', 'cmppqe8gr000c04l7n2mih9tq']) {
        const cityOrg = await prisma.organization.findUnique({
            where: { id: cityOrgId },
            select: { name: true, parentId: true, metadata: true },
        });
        const count = await (prisma as any).opticProduct.count({ where: { organizationId: cityOrgId } });
        console.log(`\n${cityOrg?.name}: parentId=${cityOrg?.parentId}, products=${count}`);
        const cm = (cityOrg as any)?.metadata;
        if (cm?.itigris) console.log('  itigris:', `login=${cm.itigris.login}, company=${cm.itigris.company}`);
    }

    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
