import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { ItigrisApiClient } from './src/lib/itigris';

async function main() {
    const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL!;
    const pool = new pg.Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const mainOrgId = 'cmowv0aio000204la3rf3ff0f';
    const org = await prisma.organization.findUnique({ where: { id: mainOrgId } });
    const meta = (org as any).metadata || {};
    const config = meta.itigris;
    
    if (!config) {
        console.log('No ITIGRIS config found on main org');
        process.exit(1);
    }
    
    console.log('Connecting to ITIGRIS as:', config.login);
    const client = new ItigrisApiClient({
        company: config.company,
        login: config.login,
        password: config.password,
        organizationId: mainOrgId,
        departmentId: config.departmentId || 0
    });
    
    try {
        const departments = await client.getDepartments();
        
        console.log(`Found ${departments.length} departments in ITIGRIS.`);
        
        // Also get stores from dictionary
        for (const dept of departments) {
            console.log(` - ID: ${dept.id} | Name: ${dept.name} | Type: ${dept.type}`);
        }
        
    } catch(err) {
        console.error('Failed to get departments:', err);
    }
    
    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
