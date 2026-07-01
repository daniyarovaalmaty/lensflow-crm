/**
 * fix-org-schema.js
 *
 * Добавляет недостающие колонки в таблицу organizations
 * чтобы она соответствовала Prisma схеме.
 *
 * Запускать: node fix-org-schema.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔄 Fixing organizations table schema...\n');

        await client.query('BEGIN');

        // 1. Добавить enum OrgType если не существует
        await client.query(`
            DO $$ BEGIN
                CREATE TYPE "OrgType" AS ENUM ('standalone','headquarters','branch','distributor','laboratory');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        `);
        console.log('✅ OrgType enum ready');

        // 2. Добавить колонку type
        await client.query(`
            ALTER TABLE "organizations"
            ADD COLUMN IF NOT EXISTS "type" "OrgType" NOT NULL DEFAULT 'standalone';
        `);
        console.log('✅ organizations.type added');

        // 3. Добавить parentId (self-relation)
        await client.query(`
            ALTER TABLE "organizations"
            ADD COLUMN IF NOT EXISTS "parentId" TEXT;
        `);
        console.log('✅ organizations.parentId added');

        // 4. Добавить defaultLabId
        await client.query(`
            ALTER TABLE "organizations"
            ADD COLUMN IF NOT EXISTS "defaultLabId" TEXT;
        `);
        console.log('✅ organizations.defaultLabId added');

        // 5. Добавить crmPhone
        await client.query(`
            ALTER TABLE "organizations"
            ADD COLUMN IF NOT EXISTS "crmPhone" TEXT;
        `);
        console.log('✅ organizations.crmPhone added');

        // 6. Добавить enum UserRole значение distributor если не существует
        try {
            await client.query(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'distributor'`);
            console.log('✅ UserRole.distributor added');
        } catch (e) {
            console.log('ℹ️  UserRole.distributor already exists');
        }

        // 7. Добавить SubRole значения для дистрибьютора
        const distSubRoles = ['dist_head', 'dist_admin', 'dist_manager', 'dist_accountant'];
        await client.query('COMMIT'); // COMMIT перед ALTER TYPE — они не работают в транзакции
        
        for (const val of distSubRoles) {
            try {
                await client.query(`ALTER TYPE "SubRole" ADD VALUE IF NOT EXISTS '${val}'`);
                console.log(`✅ SubRole.${val} added`);
            } catch (e) {
                console.log(`ℹ️  SubRole.${val} already exists`);
            }
        }

        // 8. Установить type = 'distributor' для организации дистрибьютора
        await client.query(`
            UPDATE "organizations"
            SET "type" = 'distributor'
            WHERE id = 'org-test-distributor';
        `);

        // 9. Установить type = 'laboratory' для лабораторий
        await client.query(`
            UPDATE "organizations"
            SET "type" = 'laboratory'
            WHERE id IN ('org-lab-medinvision', 'org-demo-lab');
        `);

        console.log('\n✅ Schema fixed successfully!');
        console.log('\n📋 Now run: node create-test-distributor.js');

    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('\n❌ Error:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
