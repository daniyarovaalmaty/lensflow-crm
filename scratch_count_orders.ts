import { Pool } from 'pg';
import { createItigrisClient } from './src/lib/itigris/client';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new Pool({ connectionString: process.env.DIRECT_URL });
    const { rows } = await pool.query('SELECT id, metadata FROM "organizations"');
    
    let config = null;
    let orgId = null;
    for (const row of rows) {
        console.log(`Org ID: ${row.id}`);
        console.log(`Itigris Metadata: ${JSON.stringify(row.metadata?.itigris, null, 2)}`);
    }
}

}

main().catch(console.error).finally(() => prisma.$disconnect());
