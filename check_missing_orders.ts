import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const orgs = await prisma.organization.findMany({ where: { name: { contains: 'Народная', mode: 'insensitive' } } });
    console.log('Orgs matching "Народная":');
    for (const org of orgs) {
        const c = await (prisma as any).order.count({ where: { organizationId: org.id } });
        console.log(`- ${org.name} (id: ${org.id}): ${c} orders`);
    }

    // Check if they were accidentally moved to MedMundus or another org
    const totalOrders = await (prisma as any).order.count();
    console.log(`Total orders in DB: ${totalOrders}`);

    const astanaOrders = await (prisma as any).order.findMany({
        where: { organization: { name: 'Оптика Народная Астана' } },
        include: { patient: true }
    });
    console.log('Astana orders:');
    for (const o of astanaOrders) {
        console.log(`- ${o.orderNumber}: ${o.patient?.name} (${o.createdAt}) status: ${o.status}`);
    }

    await prisma.$disconnect();
    await pool.end();
}

main();
