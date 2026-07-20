require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // Find organization by user email
    const user = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' },
        select: { organizationId: true, organization: { select: { name: true } } }
    });
    
    if (!user?.organizationId) {
        console.error('User or organization not found!');
        process.exit(1);
    }

    const orgId = user.organizationId;
    console.log(`Using organization: ${user.organization?.name} (${orgId})\n`);

    const result = await prisma.opticProduct.updateMany({
        where: { organizationId: orgId },
        data: { trackSerials: true }
    });

    console.log(`Updated ${result.count} products to use serial tracking (trackSerials = true)`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
