import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
    const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL!;
    const pool = new pg.Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false }, statement_timeout: 30000 });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const orgId = 'cmowv0aio000204la3rf3ff0f';

    const total = await (prisma as any).opticProduct.count({ where: { organizationId: orgId } });
    const newest = await (prisma as any).opticProduct.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, name: true },
    });
    
    const ageSeconds = (Date.now() - new Date(newest.createdAt).getTime()) / 1000;
    const stillRunning = ageSeconds < 60;
    
    console.log(`Total: ${total}`);
    console.log(`Newest: ${newest.createdAt} (${Math.round(ageSeconds)}s ago) | ${newest.name}`);
    console.log(`Status: ${stillRunning ? '⏳ STILL RUNNING' : '✅ SYNC COMPLETED'}`);

    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
