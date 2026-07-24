import { Client } from 'pg';

const directUrl = 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';

async function main() {
    const client = new Client({ connectionString: directUrl, connectionTimeoutMillis: 5000 });
    try {
        console.log('Connecting to direct database to kill idle connections...');
        await client.connect();
        
        // Terminate all connections to the 'postgres' database except our own
        const res = await client.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = 'postgres' 
            AND pid <> pg_backend_pid()
            AND state = 'idle';
        `);
        console.log(`Terminated connections: ${res.rowCount}`);
    } catch (e) {
        console.error('Failed:', e);
    } finally {
        await client.end();
    }
}
main();
