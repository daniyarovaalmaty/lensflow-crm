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

    const mainOrgId = 'cmowv0aio000204la3rf3ff0f';

    const sampleProduct = await (prisma as any).opticProduct.findFirst({
        where: { organizationId: mainOrgId, specs: { path: ['source'], equals: 'itigris' } },
        select: { specs: true }
    });
    
    console.log('Sample product specs:', JSON.stringify(sampleProduct?.specs, null, 2));

    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
