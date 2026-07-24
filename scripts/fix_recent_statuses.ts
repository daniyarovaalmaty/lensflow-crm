import 'dotenv/config';
if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
}
import prisma from '../src/lib/db/prisma';
import { ItigrisSyncService } from '../src/lib/itigris/sync';
import { ItigrisApiClient } from '../src/lib/itigris/client';

async function main() {
    try {
        const org = await prisma.organization.findFirst({
            where: { name: 'Оптика Народная' }
        });
        if (!org) throw new Error('Org not found');

        const meta = org.metadata as any;
        if (!meta?.itigris?.company) throw new Error('No itigris settings');

        const client = new ItigrisApiClient({
            company: meta.itigris.company,
            login: meta.itigris.login,
            password: meta.itigris.password,
            departmentId: meta.itigris.departmentId,
            organizationId: org.id
        });
        await client.signIn();

        const syncService = new ItigrisSyncService(client, prisma as any, org.id);
        
        console.log(`Fixing recent orders (restoring their true statuses)...`);
        const result = await syncService.syncOrders({ 
            skipExisting: false, // We MUST update existing ones to fix them!
            limitMonths: 1       // Only check the last month to be fast
        });
        console.log(`Sync Finished:`, result);
    } catch (e) {
        console.error(e);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
