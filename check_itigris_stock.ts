import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const org = await prisma.organization.findFirst({ where: { name: { contains: 'Народная', mode: 'insensitive' } } });
    if (!org) return console.log('Org not found');

    const c = await (prisma as any).opticProduct.count({ where: { organizationId: org.id } });
    const i = await (prisma as any).opticProduct.count({ where: { organizationId: org.id, source: 'itigris' } });
    
    console.log(`Total products: ${c}`);
    console.log(`From Itigris: ${i}`);
    
    await prisma.$disconnect();
    await pool.end();
}

main();
