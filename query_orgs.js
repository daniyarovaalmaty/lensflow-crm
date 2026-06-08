const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

async function main() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const ckk = await prisma.organization.findFirst({ where: { name: 'ЦКК Дистрибьютор' }});
    console.log("CKK:", ckk.id, ckk.type);

    const related = await prisma.organization.findMany({
        where: {
            OR: [
                { parentId: ckk.id },
                { defaultLabId: ckk.id }
            ]
        }
    });
    console.log("Related to CKK:", related.map(r => ({ name: r.name, parentId: r.parentId, defaultLabId: r.defaultLabId })));
    process.exit(0);
}
main();
