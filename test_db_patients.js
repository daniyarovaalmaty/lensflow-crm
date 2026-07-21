const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
        ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    
    const res = await client.query(`SELECT id, name FROM "organizations" WHERE name = 'Оптика Народная'`);
    if(res.rows[0]) {
        const countRes = await client.query(`SELECT COUNT(*) FROM "patients" WHERE "organizationId" = $1`, [res.rows[0].id]);
        console.log(`Patients in local DB for ${res.rows[0].name}:`, countRes.rows[0].count);
    }
    await client.end();
}

main().catch(console.error);
