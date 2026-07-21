const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
        ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    
    const res = await client.query(`SELECT id, name, metadata FROM "organizations"`);
    for (let org of res.rows) {
        const meta = typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata;
        if (meta && meta.itigris) {
            console.log("✅ Found Itigris config in:", org.name);
            const c = meta.itigris;
            const authRes = await fetch(`https://optima.itigris.ru/${c.company}/api/v2/sign/in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company: c.company, login: c.login, password: c.password, departmentId: c.departmentId })
            });
            if (!authRes.ok) { console.log("Failed:", await authRes.text()); continue; }
            const authData = await authRes.json();
            const countRes = await fetch(`https://optima.itigris.ru/${c.company}/api/v2/clients?clientSearchType=FULL_NAME&searchQuery=%D0%90&deleted=false&page=0&size=1`, {
                headers: { 'Authorization': `Bearer ${authData.accessToken}` }
            });
            if (countRes.ok) {
                const countData = await countRes.json();
                console.log(`Total patients in ${org.name}:`, countData.totalElements);
                if (countData.content && countData.content.length > 0) {
                    console.log("Sample client:", JSON.stringify(countData.content[0], null, 2));
                }
            }
        }
    }
    await client.end();
}

main().catch(console.error);
