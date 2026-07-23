import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
    const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL!;
    const pool = new pg.Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const mainOrgId = 'cmowv0aio000204la3rf3ff0f';

    // 1. Get all unique department IDs from products
    console.log('Fetching unique department IDs from products...');
    const deptsRaw = await (prisma as any).$queryRaw`
        SELECT DISTINCT specs->>'department' as department_id
        FROM optic_products
        WHERE "organizationId" = ${mainOrgId} AND specs->>'source' = 'itigris'
        ORDER BY department_id
    `;
    const productDepts = deptsRaw.map((r: any) => r.department_id).filter(Boolean);
    console.log(`Found ${productDepts.length} unique departments in products:`, productDepts);

    // 2. Get existing child organizations (branches)
    console.log('\nFetching existing child organizations (branches)...');
    const existingBranches = await prisma.organization.findMany({
        where: { parentId: mainOrgId }
    });
    
    console.log(`Found ${existingBranches.length} child organizations.`);
    for (const branch of existingBranches) {
        const meta = (branch as any).metadata || {};
        const itigris = meta.itigris || {};
        const deptId = itigris.departmentId || meta.itigrisDepartmentId;
        console.log(` - ID: ${branch.id} | Name: ${branch.name} | DeptID (from meta): ${deptId}`);
    }

    // 3. Compare and see if we need to create any missing branches
    const branchMap = new Map(); // department_id string -> organizationId
    for (const branch of existingBranches) {
        const meta = (branch as any).metadata || {};
        const itigris = meta.itigris || {};
        const deptId = String(itigris.departmentId || meta.itigrisDepartmentId || '');
        if (deptId && deptId !== 'undefined' && deptId !== 'null') {
            branchMap.set(deptId, branch.id);
        }
    }

    console.log('\nMapping status:');
    for (const deptId of productDepts) {
        if (branchMap.has(deptId)) {
            console.log(` - Dept ${deptId} -> Branch ${branchMap.get(deptId)}`);
        } else {
            console.log(` - Dept ${deptId} -> ❌ NO BRANCH FOUND`);
        }
    }

    await prisma.$disconnect();
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
