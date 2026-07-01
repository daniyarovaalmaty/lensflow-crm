/**
 * apply-distributor-prices.js
 *
 * Запускать командой:  node apply-distributor-prices.js
 *
 * Этот скрипт:
 *  1. Добавляет колонку distributorPriceByDk в таблицу products
 *  2. Проставляет цены дистрибьютора по официальному прайсу лаборатории
 *  3. Исправляет цену пробной линзы (ML-TRIAL-DK50) до 12 000 ₸
 *
 * Не требует `prisma migrate deploy` — работает напрямую через pg.
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔄 Applying distributor price migration...\n');

        await client.query('BEGIN');

        // 1. Add column (safe — IF NOT EXISTS)
        await client.query(`
            ALTER TABLE "products"
            ADD COLUMN IF NOT EXISTS "distributorPriceByDk" JSONB;
        `);
        console.log('✅ Column distributorPriceByDk added (or already exists)');

        // 2. Fix trial lens: clinic price 12 000, distributor price 7 600
        const trial = await client.query(`
            UPDATE "products"
            SET
                "price" = 12000,
                "distributorPriceByDk" = '{"50": 7600}'::jsonb
            WHERE "sku" = 'ML-TRIAL-DK50'
            RETURNING name, price, "distributorPriceByDk";
        `);
        if (trial.rowCount > 0) {
            console.log(`✅ Trial lens (ML-TRIAL-DK50): clinic=${trial.rows[0].price} ₸, distributor DK50=7600 ₸`);
        } else {
            console.log('⚠️  Trial lens (ML-TRIAL-DK50) NOT FOUND — run "npm run add-dk50-trial" first');
        }

        // 3. Spherical lenses distributor pricing
        const spherical = await client.query(`
            UPDATE "products"
            SET "distributorPriceByDk" = '{"100": 17500, "125": 18500, "180": 20500}'::jsonb
            WHERE "description" = 'spherical' AND "category" = 'lens'
            RETURNING name;
        `);
        console.log(`✅ Spherical lenses updated (${spherical.rowCount} rows): DK100=17500, DK125=18500, DK180=20500`);

        // 4. Toric lenses distributor pricing
        const toric = await client.query(`
            UPDATE "products"
            SET "distributorPriceByDk" = '{"100": 18500, "125": 19500, "180": 21500}'::jsonb
            WHERE "description" = 'toric' AND "category" = 'lens'
            RETURNING name;
        `);
        console.log(`✅ Toric lenses updated (${toric.rowCount} rows): DK100=18500, DK125=19500, DK180=21500`);

        await client.query('COMMIT');
        console.log('\n✅ Migration committed successfully!');

        // 5. Print summary
        const all = await client.query(`
            SELECT name, sku, description, price, "priceByDk", "distributorPriceByDk"
            FROM "products"
            WHERE category = 'lens'
            ORDER BY "sortOrder", name;
        `);
        console.log('\n📋 Current lens catalog:');
        for (const row of all.rows) {
            console.log(`\n  📦 ${row.name}`);
            console.log(`     sku: ${row.sku || '-'}  |  desc: ${row.description || '-'}`);
            console.log(`     price (clinic):          ${row.price} ₸`);
            console.log(`     priceByDk:               ${JSON.stringify(row.priceByDk)}`);
            console.log(`     distributorPriceByDk:    ${JSON.stringify(row.distributorPriceByDk)}`);
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error — rolled back:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
