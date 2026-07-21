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

    // Check if same SKU appears with different IDs (true duplicates)
    const dupesByName = await (prisma as any).$queryRaw`
        SELECT name, sku, COUNT(*)::int as cnt 
        FROM optic_products 
        WHERE "organizationId" = ${orgId}
        GROUP BY name, sku
        HAVING COUNT(*) > 1 
        ORDER BY COUNT(*) DESC 
        LIMIT 10
    `;
    console.log('Products with same name+sku appearing multiple times:');
    console.log(JSON.stringify(dupesByName, null, 2));

    // Check rate: products created in last 5 minutes vs 5 min before that
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    const recentCount = await (prisma as any).opticProduct.count({
        where: { organizationId: orgId, createdAt: { gte: fiveMinAgo } },
    });
    const prevCount = await (prisma as any).opticProduct.count({
        where: { organizationId: orgId, createdAt: { gte: tenMinAgo, lt: fiveMinAgo } },
    });
    console.log(`\nLast 5 min: ${recentCount} new products`);
    console.log(`5-10 min ago: ${prevCount} new products`);
    
    if (recentCount === 0) {
        console.log('\n*** SYNC APPEARS TO HAVE STOPPED ***');
    } else {
        console.log(`\nRate: ~${Math.round(recentCount / 5)} products/min`);
    }

    // Total
    const total = await (prisma as any).opticProduct.count({ where: { organizationId: orgId } });
    console.log(`\nTotal: ${total}`);

    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
