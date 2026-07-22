import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const users = await prisma.user.findMany({
        where: {
            organizationId: {
                in: [
                    'cmowv0aio000204la3rf3ff0f', // HQ
                    'cmppqdn94000004gs8rwc1upr', // Astana
                    'cmppqdyy7000104gshlynzaw6', // Aktobe
                    'cmppqe8gr000c04l7n2mih9tq'  // Kostanay
                ]
            }
        },
        select: { email: true, role: true, subRole: true, organizationId: true, id: true }
    });

    console.log('Users in Narodnaya group:');
    users.forEach(u => console.log(`- ${u.email}: role=${u.role}, subRole=${u.subRole}, org=${u.organizationId}`));

    await prisma.$disconnect();
    await pool.end();
}
main();
