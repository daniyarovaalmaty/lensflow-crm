require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function updateTrackSerials() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('No DATABASE_URL found in .env.local');
        process.exit(1);
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const user = await prisma.user.findUnique({
            where: { email: 'medinnovation.kaz2021@gmail.com' }
        });

        if (!user) {
            console.error('User not found');
            return;
        }

        const org = await prisma.organization.findFirst({
            where: {
                users: {
                    some: { id: user.id }
                }
            }
        });

        if (!org) {
            console.error('Organization not found');
            return;
        }

        console.log(`Found org: ${org.id} for user ${user.email}`);

        const updateResult = await prisma.opticProduct.updateMany({
            where: {
                organizationId: org.id
            },
            data: {
                trackSerials: true
            }
        });

        console.log(`Successfully updated ${updateResult.count} products to have trackSerials = true.`);

    } catch (error) {
        console.error('Error updating products:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateTrackSerials();
