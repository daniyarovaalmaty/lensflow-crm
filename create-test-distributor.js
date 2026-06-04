/**
 * create-test-distributor.js
 *
 * Создаёт тестового дистрибьютора для проверки цен.
 * Запускать: node create-test-distributor.js
 *
 * Логин:  distributor@test.kz
 * Пароль: Distributor2026!
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔄 Creating test distributor...\n');

        await client.query('BEGIN');

        // 1. Добавить значение distributor в UserRole если его нет
        try {
            await client.query(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'distributor'`);
            console.log('✅ UserRole: added distributor');
        } catch (e) {
            console.log('ℹ️  UserRole distributor already exists');
        }

        // 2. Добавить dist_head в SubRole если его нет
        try {
            await client.query(`ALTER TYPE "SubRole" ADD VALUE IF NOT EXISTS 'dist_head'`);
            console.log('✅ SubRole: added dist_head');
        } catch (e) {
            console.log('ℹ️  SubRole dist_head already exists');
        }

        await client.query('COMMIT');

        // ALTER TYPE не работает внутри транзакции — начинаем новую
        await client.query('BEGIN');

        // 3. Создать организацию-дистрибьютора
        const orgResult = await client.query(`
            INSERT INTO "organizations" (id, name, status, city, "createdAt", "updatedAt")
            VALUES ('org-test-distributor', 'Тест Дистрибьютор', 'active', 'Алматы', NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active'
            RETURNING id, name, status;
        `);
        console.log('✅ Organization:', orgResult.rows[0].name);

        // 4. Создать пользователя
        const password = await bcrypt.hash('Distributor2026!', 10);
        const userResult = await client.query(`
            INSERT INTO "users" (
                id, email, password, "fullName", role, "subRole", status,
                "organizationId", "createdAt", "updatedAt"
            )
            VALUES (
                'user-test-distributor', 'distributor@test.kz', $1,
                'Тест Дистрибьютор', 'distributor', 'dist_head', 'active',
                'org-test-distributor', NOW(), NOW()
            )
            ON CONFLICT (email) DO UPDATE SET
                password = EXCLUDED.password,
                status = 'active',
                role = 'distributor',
                "subRole" = 'dist_head',
                "organizationId" = 'org-test-distributor'
            RETURNING email, role, "subRole", status;
        `, [password]);

        await client.query('COMMIT');

        const u = userResult.rows[0];
        console.log('✅ User:', u.email, '| role:', u.role, '| subRole:', u.subRole);
        console.log('\n🎉 Done!');
        console.log('   Email:    distributor@test.kz');
        console.log('   Password: Distributor2026!');
        console.log('   URL:      http://localhost:3000/login');

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
