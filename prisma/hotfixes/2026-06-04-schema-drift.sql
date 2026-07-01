-- Hotfix 2026-06-04: align production DB with Prisma schema (drift fix).
-- The shared Neon DB was missing columns/tables that the code expects, which
-- caused Prisma errors like: The column `(not available)` does not exist.
-- Symptoms: distributor order creation failed; POS sale creation returned 500.
-- All statements are additive and idempotent (safe to re-run). Already applied
-- to production on 2026-06-04 via DIRECT_URL.

BEGIN;

-- Distributor / lab routing on orders (distributor order creation hotfix)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "distributorOrgId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "labOrgId" TEXT;

-- POS sale lead attribution
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

-- ITIGRIS sync log table
CREATE TABLE IF NOT EXISTS "itigris_sync_logs" (
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
);

-- User <-> branch mapping table
CREATE TABLE IF NOT EXISTS "user_branches" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_branches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_branches_userId_branchId_key"
  ON "user_branches" ("userId", "branchId");

COMMIT;
