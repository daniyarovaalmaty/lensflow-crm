import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

// ⚠️ TEMPORARY one-time schema-fix endpoint.
// Adds columns/tables that the code expects but that may be missing in an
// out-of-date production DB. All statements are additive and idempotent
// (IF NOT EXISTS) — nothing is dropped or modified, no data loss.
// Guarded by a secret token. REMOVE THIS FILE after running it once.
const TOKEN = 'lf-fixschema-2026-a7F3k9Q2xR8m';

const STATEMENTS: { label: string; sql: string }[] = [
    { label: 'products.distributorPriceByDk', sql: `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "distributorPriceByDk" JSONB` },
    { label: 'orders.distributorOrgId', sql: `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "distributorOrgId" TEXT` },
    { label: 'orders.labOrgId', sql: `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "labOrgId" TEXT` },
    { label: 'sales.leadId', sql: `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "leadId" TEXT` },
    {
        label: 'table itigris_sync_logs',
        sql: `CREATE TABLE IF NOT EXISTS "itigris_sync_logs" (
            "id" TEXT NOT NULL,
            "organizationId" TEXT NOT NULL,
            "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "entity" TEXT NOT NULL,
            "created" INTEGER NOT NULL DEFAULT 0,
            "updated" INTEGER NOT NULL DEFAULT 0,
            "errors" INTEGER NOT NULL DEFAULT 0,
            "details" JSONB,
            "triggeredBy" TEXT,
            "durationMs" INTEGER,
            CONSTRAINT "itigris_sync_logs_pkey" PRIMARY KEY ("id")
        )`,
    },
    {
        label: 'table user_branches',
        sql: `CREATE TABLE IF NOT EXISTS "user_branches" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "branchId" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "user_branches_pkey" PRIMARY KEY ("id")
        )`,
    },
    { label: 'index user_branches unique', sql: `CREATE UNIQUE INDEX IF NOT EXISTS "user_branches_userId_branchId_key" ON "user_branches" ("userId", "branchId")` },
];

async function run() {
    const results: any[] = [];
    for (const { label, sql } of STATEMENTS) {
        try {
            await prisma.$executeRawUnsafe(sql);
            results.push({ step: label, ok: true });
        } catch (e: any) {
            results.push({ step: label, ok: false, error: e?.message || String(e) });
        }
    }

    // Verify the key columns/tables now exist
    const verify: any = await prisma.$queryRawUnsafe(`
        SELECT
          (SELECT count(*) FROM information_schema.columns WHERE table_name='products' AND column_name='distributorPriceByDk') AS products_distprice,
          (SELECT count(*) FROM information_schema.columns WHERE table_name='orders' AND column_name='distributorOrgId') AS orders_distorg,
          (SELECT count(*) FROM information_schema.columns WHERE table_name='orders' AND column_name='labOrgId') AS orders_laborg,
          (SELECT count(*) FROM information_schema.columns WHERE table_name='sales' AND column_name='leadId') AS sales_leadid,
          (SELECT count(*) FROM information_schema.tables WHERE table_name='itigris_sync_logs') AS tbl_itigris,
          (SELECT count(*) FROM information_schema.tables WHERE table_name='user_branches') AS tbl_userbranches
    `);

    // BigInt-safe serialization
    const verified = JSON.parse(JSON.stringify(verify, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
    return { done: true, results, verified };
}

export async function GET(req: NextRequest) {
    if (req.nextUrl.searchParams.get('token') !== TOKEN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(await run());
}

export async function POST(req: NextRequest) {
    if (req.nextUrl.searchParams.get('token') !== TOKEN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(await run());
}
