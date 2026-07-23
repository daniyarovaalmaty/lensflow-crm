import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const orgs = await prisma.organization.findMany({
        where: { name: { contains: 'Народная' } },
        select: { id: true, name: true, type: true, parentId: true }
    });

    console.log('Organizations:');
    orgs.forEach(o => console.log(o));

    await prisma.$disconnect();
    await pool.end();
}
main();
