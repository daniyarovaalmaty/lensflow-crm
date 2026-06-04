/**
 * check-db.js — проверяет реальную структуру БД
 * node check-db.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function run() {
    const client = await pool.connect();
    try {
        // 1. Список таблиц
        const tables = await client.query(`
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `);
        console.log('📋 Tables in DB:');
        tables.rows.forEach(r => console.log('  -', r.tablename));

        // 2. Колонки таблицы organizations (если есть)
        const orgExists = tables.rows.find(r => r.tablename === 'organizations');
        if (orgExists) {
            const cols = await client.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'organizations'
                ORDER BY ordinal_position;
            `);
            console.log('\n📋 organizations columns:');
            cols.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
        }

        // 3. Колонки таблицы products (если есть)
        const prodExists = tables.rows.find(r => r.tablename === 'products');
        if (prodExists) {
            const cols = await client.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'products'
                ORDER BY ordinal_position;
            `);
            console.log('\n📋 products columns:');
            cols.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

            const count = await client.query(`SELECT COUNT(*) FROM products`);
            console.log(`\n  Total products: ${count.rows[0].count}`);
        }

        // 4. Колонки таблицы users (если есть)
        const usersExists = tables.rows.find(r => r.tablename === 'users');
        if (usersExists) {
            const cols = await client.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position;
            `);
            console.log('\n📋 users columns:');
            cols.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

            const count = await client.query(`SELECT COUNT(*) FROM users`);
            console.log(`\n  Total users: ${count.rows[0].count}`);

            // Показать роли существующих пользователей
            const roles = await client.query(`SELECT email, role, "subRole" FROM users LIMIT 10`);
            if (roles.rows.length > 0) {
                console.log('\n  Existing users:');
                roles.rows.forEach(r => console.log(`    ${r.email} | role: ${r.role} | subRole: ${r.subRole}`));
            }
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
