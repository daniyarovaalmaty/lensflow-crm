import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
    const total = await prisma.patient.count();
    const byOrg = await prisma.patient.groupBy({
        by: ['organizationId'],
        _count: true
    });
    console.log('Total Patients:', total);
    console.log('By Org:', byOrg);
}

run().catch(console.error).finally(() => prisma.$disconnect());
