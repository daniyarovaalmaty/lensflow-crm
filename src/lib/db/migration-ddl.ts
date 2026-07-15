/**
 * Additive, idempotent prod migration DDL — single source of truth for the
 * /api/admin/migrate endpoint (and its validation script). Mirrors what
 * `prisma db push` produced on the test DB. CREATE/ADD ... IF NOT EXISTS only.
 */

export interface MigTable { name: string; create: string; indexes: string[] }

export const MIGRATION_TABLES: MigTable[] = [
    {
        name: 'tasks',
        create: `CREATE TABLE IF NOT EXISTS "tasks" (
            "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "title" TEXT NOT NULL,
            "description" TEXT, "status" TEXT NOT NULL DEFAULT 'new', "priority" TEXT NOT NULL DEFAULT 'normal',
            "dueDate" TIMESTAMP(3), "assignedById" TEXT, "assignedByName" TEXT, "assignedToId" TEXT, "assignedToName" TEXT,
            "relatedType" TEXT, "relatedId" TEXT, "relatedLabel" TEXT, "completedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"))`,
        indexes: [
            `CREATE INDEX IF NOT EXISTS "tasks_organizationId_idx" ON "tasks"("organizationId")`,
            `CREATE INDEX IF NOT EXISTS "tasks_assignedToId_idx" ON "tasks"("assignedToId")`,
            `CREATE INDEX IF NOT EXISTS "tasks_assignedById_idx" ON "tasks"("assignedById")`,
        ],
    },
    {
        name: 'news_posts',
        create: `CREATE TABLE IF NOT EXISTS "news_posts" (
            "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL,
            "pinned" BOOLEAN NOT NULL DEFAULT false, "authorId" TEXT, "authorName" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id"))`,
        indexes: [`CREATE INDEX IF NOT EXISTS "news_posts_organizationId_idx" ON "news_posts"("organizationId")`],
    },
    {
        name: 'news_read_state',
        create: `CREATE TABLE IF NOT EXISTS "news_read_state" (
            "id" TEXT NOT NULL, "userId" TEXT NOT NULL,
            "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "news_read_state_pkey" PRIMARY KEY ("id"))`,
        indexes: [`CREATE UNIQUE INDEX IF NOT EXISTS "news_read_state_userId_key" ON "news_read_state"("userId")`],
    },
    {
        name: 'repair_orders',
        create: `CREATE TABLE IF NOT EXISTS "repair_orders" (
            "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "number" TEXT NOT NULL,
            "clientName" TEXT, "clientPhone" TEXT, "itemDescription" TEXT NOT NULL, "problem" TEXT,
            "price" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'accepted', "masterName" TEXT, "notes" TEXT,
            "readyAt" TIMESTAMP(3), "issuedAt" TIMESTAMP(3), "createdById" TEXT, "createdByName" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "repair_orders_pkey" PRIMARY KEY ("id"))`,
        indexes: [`CREATE INDEX IF NOT EXISTS "repair_orders_organizationId_idx" ON "repair_orders"("organizationId")`],
    },
    {
        name: 'order_reworks',
        create: `CREATE TABLE IF NOT EXISTS "order_reworks" (
            "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "orderNumber" TEXT, "description" TEXT NOT NULL,
            "responsibleType" TEXT NOT NULL DEFAULT 'master', "responsibleName" TEXT, "cost" INTEGER NOT NULL DEFAULT 0,
            "status" TEXT NOT NULL DEFAULT 'open', "createdById" TEXT, "createdByName" TEXT, "resolvedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "order_reworks_pkey" PRIMARY KEY ("id"))`,
        indexes: [
            `CREATE INDEX IF NOT EXISTS "order_reworks_organizationId_idx" ON "order_reworks"("organizationId")`,
            `CREATE INDEX IF NOT EXISTS "order_reworks_orderNumber_idx" ON "order_reworks"("orderNumber")`,
        ],
    },
    {
        name: 'supplier_orders',
        create: `CREATE TABLE IF NOT EXISTS "supplier_orders" (
            "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "number" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'draft', "supplierName" TEXT, "supplierOrgId" TEXT,
            "items" JSONB NOT NULL, "totalAmount" INTEGER NOT NULL DEFAULT 0, "notes" TEXT,
            "createdById" TEXT, "createdByName" TEXT, "sentAt" TIMESTAMP(3), "receivedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id"))`,
        indexes: [`CREATE INDEX IF NOT EXISTS "supplier_orders_organizationId_idx" ON "supplier_orders"("organizationId")`],
    },
    {
        name: 'stock_transfers',
        create: `CREATE TABLE IF NOT EXISTS "stock_transfers" (
            "id" TEXT NOT NULL, "number" TEXT NOT NULL, "fromOrgId" TEXT NOT NULL, "toOrgId" TEXT NOT NULL,
            "fromName" TEXT, "toName" TEXT, "status" TEXT NOT NULL DEFAULT 'draft', "items" JSONB NOT NULL,
            "totalQty" INTEGER NOT NULL DEFAULT 0, "notes" TEXT, "createdById" TEXT, "createdByName" TEXT,
            "sentAt" TIMESTAMP(3), "receivedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id"))`,
        indexes: [
            `CREATE INDEX IF NOT EXISTS "stock_transfers_fromOrgId_idx" ON "stock_transfers"("fromOrgId")`,
            `CREATE INDEX IF NOT EXISTS "stock_transfers_toOrgId_idx" ON "stock_transfers"("toOrgId")`,
        ],
    },
];

export const MIGRATION_COLUMNS: { table: string; column: string; ddl: string }[] = [
    { table: 'patients', column: 'metadata', ddl: `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "metadata" JSONB` },
    { table: 'prescriptions', column: 'externalId', ddl: `ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "externalId" TEXT` },
    { table: 'prescriptions', column: 'externalSource', ddl: `ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "externalSource" TEXT` },
    { table: 'appointments', column: 'externalId', ddl: `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "externalId" TEXT` },
    { table: 'appointments', column: 'externalSource', ddl: `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "externalSource" TEXT` },
    { table: 'optic_products', column: 'expiryDate', ddl: `ALTER TABLE "optic_products" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3)` },
    { table: 'optic_products', column: 'shelfLocation', ddl: `ALTER TABLE "optic_products" ADD COLUMN IF NOT EXISTS "shelfLocation" TEXT` },
    { table: 'optic_products', column: 'isMedical', ddl: `ALTER TABLE "optic_products" ADD COLUMN IF NOT EXISTS "isMedical" BOOLEAN NOT NULL DEFAULT false` },
    { table: 'optic_products', column: 'certNumber', ddl: `ALTER TABLE "optic_products" ADD COLUMN IF NOT EXISTS "certNumber" TEXT` },
    { table: 'optic_products', column: 'certUntil', ddl: `ALTER TABLE "optic_products" ADD COLUMN IF NOT EXISTS "certUntil" TIMESTAMP(3)` },
];

export const MIGRATION_COLUMN_INDEXES: string[] = [
    `CREATE INDEX IF NOT EXISTS "prescriptions_externalId_idx" ON "prescriptions"("externalId")`,
    `CREATE INDEX IF NOT EXISTS "appointments_externalId_idx" ON "appointments"("externalId")`,
];
