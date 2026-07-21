const { Client } = require('pg');
async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || "postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true" });
    await client.connect();
    const res = await client.query("SELECT * FROM users WHERE email='optika.narodnaya.astana@gmail.com'");
    const user = res.rows[0];
    console.log("User:", user.email, "OrgID:", user.organizationId);
    if (user.organizationId) {
        const orgRes = await client.query("SELECT id, name FROM organizations WHERE id=$1", [user.organizationId]);
        console.log("Org:", orgRes.rows);
    }
    await client.end();
}
main();
