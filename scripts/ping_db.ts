import { Client } from 'pg';

const directUrl = 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';
const poolUrl = 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function ping(url: string, name: string) {
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 3000 });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = 'postgres' 
            AND pid <> pg_backend_pid()
            AND usename = current_user
            AND state = 'idle';
        `);
        console.log(`[${name}] Terminated!`, res.rowCount);
    } catch (e: any) {
        console.log(`[${name}] Failed:`, e.message);
    } finally {
        await client.end().catch(() => {});
    }
}

async function main() {
    console.log('Pinging DB...');
    await ping(directUrl, 'Direct 5432');
    await ping(poolUrl, 'Pooler 6543');
}
main();
