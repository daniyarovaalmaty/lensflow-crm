import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
    MIGRATION_TABLES as TABLES,
    MIGRATION_COLUMNS as COLUMNS,
    MIGRATION_COLUMN_INDEXES as COLUMN_INDEXES,
} from '@/lib/db/migration-ddl';

export const dynamic = 'force-dynamic';

/**
 * Token-guarded, idempotent, ADDITIVE prod migration.
 *
 * Deploying this code changes NOTHING in the DB — the endpoint is inert until
 * called with the secret token. It only ever runs CREATE TABLE / ADD COLUMN /
 * CREATE INDEX with IF NOT EXISTS (no DROP, no type changes) → safe to re-run.
 *
 * Usage (prod):
 *   POST /api/admin/migrate            → DRY-RUN: reports what's missing, changes nothing
 *   POST /api/admin/migrate?apply=true → APPLY: creates the missing objects
 *   Header: Authorization: Bearer <ADMIN_MIGRATE_TOKEN>
 *
 * DDL (src/lib/db/migration-ddl.ts) mirrors what `prisma db push` produced on the
 * test DB — verified column-equivalent via the migration validation script.
 */

async function tableExists(name: string): Promise<boolean> {
    const r: any[] = await prisma.$queryRawUnsafe(`SELECT to_regclass('public."${name}"') IS NOT NULL AS ok`);
    return !!r?.[0]?.ok;
}
async function columnExists(table: string, column: string): Promise<boolean> {
    const r: any[] = await prisma.$queryRawUnsafe(
        `SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2) AS ok`,
        table, column,
    );
    return !!r?.[0]?.ok;
}

export async function POST(req: NextRequest) {
    const token = process.env.ADMIN_MIGRATE_TOKEN;
    if (!token) return NextResponse.json({ error: 'ADMIN_MIGRATE_TOKEN не задан на сервере' }, { status: 503 });

    const authHeader = req.headers.get('authorization') || '';
    const provided = authHeader.replace(/^Bearer\s+/i, '') || new URL(req.url).searchParams.get('token') || '';
    if (provided !== token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const apply = new URL(req.url).searchParams.get('apply') === 'true';
    const report: any = {
        mode: apply ? 'apply' : 'dry-run',
        tables: [], columns: [],
        indexes: apply ? 'created (IF NOT EXISTS)' : 'skipped (dry-run)',
        errors: [],
    };

    try {
        for (const t of TABLES) {
            const exists = await tableExists(t.name);
            report.tables.push({ name: t.name, status: exists ? 'exists' : (apply ? 'created' : 'would_create') });
            if (apply) {
                await prisma.$executeRawUnsafe(t.create);
                for (const idx of t.indexes) await prisma.$executeRawUnsafe(idx);
            }
        }
        for (const c of COLUMNS) {
            const exists = await columnExists(c.table, c.column);
            report.columns.push({ table: c.table, column: c.column, status: exists ? 'exists' : (apply ? 'added' : 'would_add') });
            if (apply) await prisma.$executeRawUnsafe(c.ddl);
        }
        if (apply) for (const idx of COLUMN_INDEXES) await prisma.$executeRawUnsafe(idx);
    } catch (e: any) {
        report.errors.push(e.message);
        return NextResponse.json(report, { status: 500 });
    }

    const missingTables = report.tables.filter((t: any) => t.status === 'would_create').length;
    const missingCols = report.columns.filter((c: any) => c.status === 'would_add').length;
    report.summary = apply
        ? 'Применено (идемпотентно). Повторный запуск ничего не изменит.'
        : `Будет создано таблиц: ${missingTables}, добавлено колонок: ${missingCols}. Изменений НЕ внесено — это предпросмотр. Запустите с ?apply=true для применения.`;
    return NextResponse.json(report);
}
