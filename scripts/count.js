const { Client } = require('pg');

async function run() {
    const client = new Client({
        connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    });
    await client.connect();
    
    const res = await client.query("SELECT COUNT(*) FROM orders WHERE source = 'itigris'");
    console.log('Total Itigris orders:', res.rows[0].count);
    
    await client.end();
}

run().catch(console.error);
