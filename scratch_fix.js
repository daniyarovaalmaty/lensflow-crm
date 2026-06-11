const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres' });
async function main() {
    await pool.query('UPDATE "orders" SET "totalPrice"=38000, "priceOd"=18500, "priceOs"=19500 WHERE "orderNumber"=\'AC23\'');
    console.log("Updated AC23");
}
main().catch(console.error).finally(() => pool.end());
