const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres' });
async function main() {
    const res = await pool.query('SELECT * FROM "products"');
    console.dir(res.rows, {depth: null});
}
main().catch(console.error).finally(() => pool.end());
