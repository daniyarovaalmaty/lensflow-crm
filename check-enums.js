require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });

async function run() {
    const client = await pool.connect();
    try {
        const enums = await client.query(`
            SELECT t.typname AS enum_name, e.enumlabel AS enum_value
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname IN ('UserRole', 'SubRole', 'OrgStatus', 'OrgType')
            ORDER BY t.typname, e.enumsortorder;
        `);
        const grouped = {};
        for (const row of enums.rows) {
            if (!grouped[row.enum_name]) grouped[row.enum_name] = [];
            grouped[row.enum_name].push(row.enum_value);
        }
        for (const [name, values] of Object.entries(grouped)) {
            console.log(`\n${name}: ${values.join(', ')}`);
        }
    } finally {
        client.release();
        await pool.end();
    }
}
run().catch(console.error);
