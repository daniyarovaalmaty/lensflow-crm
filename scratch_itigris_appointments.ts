import { PrismaClient } from '@prisma/client';
import { createItigrisClient } from './src/lib/itigris/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
    const orgs = await prisma.organization.findMany();
    let config = null;
    let orgId = null;
    for (const org of orgs) {
        const meta = (org as any).metadata?.itigris;
        if (meta?.company && meta?.login && meta?.password) {
            config = meta;
            orgId = org.id;
            break;
        }
    }
    if (!config) {
        console.log("No Itigris config found");
        return;
    }

    const client = createItigrisClient({
        company: config.company,
        login: config.login,
        password: config.password,
        departmentId: config.departmentId,
        organizationId: orgId
    });

    const records = await client.getRegistryRecords({
        appointmentFrom: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        appointmentTo: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    });
    console.log("Found", records.length, "records");
    if (records.length > 0) {
        console.dir(records[0], { depth: null });
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
