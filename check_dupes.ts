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

    // 1. Current total count
    const total = await (prisma as any).opticProduct.count({ where: { organizationId: orgId } });
    console.log(`Total products now: ${total}`);

    // 2. Check for duplicates by SKU
    const result = await (prisma as any).$queryRaw`
        SELECT sku, COUNT(*)::int as cnt 
        FROM optic_products 
        WHERE "organizationId" = ${orgId} AND sku IS NOT NULL
        GROUP BY sku 
        HAVING COUNT(*) > 1 
        ORDER BY COUNT(*) DESC 
        LIMIT 20
    `;
    console.log(`\nDuplicate SKUs (top 20):`);
    console.log(JSON.stringify(result, null, 2));

    // 3. Count unique vs total SKUs
    const uniqueSkus = await (prisma as any).$queryRaw`
        SELECT COUNT(DISTINCT sku)::int as unique_skus, COUNT(*)::int as total 
        FROM optic_products 
        WHERE "organizationId" = ${orgId}
    `;
    console.log(`\nUnique SKUs vs Total:`, JSON.stringify(uniqueSkus));

    // 4. Check still growing? Newest product timestamp
    const newest = await (prisma as any).opticProduct.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, name: true, sku: true },
    });
    console.log(`\nNewest product: ${newest?.createdAt} | ${newest?.name} | ${newest?.sku}`);

    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
