const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const ckk = await prisma.organization.findFirst({
        where: { name: { contains: 'ЦКК' } }
    });
    console.log("CKK Org:", ckk?.name, "ID:", ckk?.id, "Type:", ckk?.type);
    console.log("Metadata:", JSON.stringify(ckk?.metadata, null, 2));

    await prisma.$disconnect();
    await pool.end();
}

main().catch(console.error);
