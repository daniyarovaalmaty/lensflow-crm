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
            OR: [
                { fullName: { contains: 'Григорьевская' } },
                { fullName: { contains: 'Екатерина' } }
            ]
        }
    });

    console.log('Found users:', users.map(u => ({ email: u.email, role: u.role, subRole: u.subRole })));

    await prisma.$disconnect();
    await pool.end();
}
main();
