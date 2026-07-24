import { Client } from 'pg';

const poolUrl = 'postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function main() {
    console.log('Waiting for DB connection pool to recover...');
    let attempts = 0;
    while (true) {
        attempts++;
        const client = new Client({ connectionString: poolUrl, connectionTimeoutMillis: 3000 });
        client.on('error', (err) => {
            // Ignore background connection errors
        });
        try {
            await client.connect();
            const res = await client.query('SELECT 1 as alive');
            console.log(`[Attempt ${attempts}] DB IS ALIVE AND RESPONDING!`, res.rows);
            await client.end();
            break;
        } catch (e: any) {
            console.log(`[Attempt ${attempts}] Still dead: ${e.message}`);
        }
        
        // Wait 5 seconds before next try
        await new Promise(r => setTimeout(r, 5000));
    }
}
main();
