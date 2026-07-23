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
        where: { email: { in: ['zakazy.optika.narodnaya@gmail.com', 'optika.narodnaya.astana@gmail.com'] } }
    });

    for (const u of users) {
        console.log(`- ${u.email}: role=${u.role}, subRole=${u.subRole}, orgId=${u.organizationId}`);
    }

    await prisma.$disconnect();
    await pool.end();
}
main();
