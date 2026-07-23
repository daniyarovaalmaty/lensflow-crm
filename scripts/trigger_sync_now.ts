import 'dotenv/config';
import prisma from '../src/lib/db/prisma';
import { ItigrisApiClient } from '../src/lib/itigris/client';
import { ItigrisSyncService } from '../src/lib/itigris/sync';

async function main() {
    const org = await prisma.organization.findFirst({ where: { name: 'Оптика Народная' } });
    const meta: any = org?.metadata;
    if (meta?.itigris) {
        console.log("Starting manual Itigris order sync for the last 6 months...");
        
        const client = new ItigrisApiClient({
            company: meta.itigris.company,
            login: meta.itigris.login,
            password: meta.itigris.password,
            departmentId: meta.itigris.departmentId,
            organizationId: org.id
        });
        await client.signIn();

        const syncService = new ItigrisSyncService(client, prisma as any, org.id);
        const result = await syncService.syncOrders({ skipExisting: true });
        console.log("Sync Finished:", result);
    }
}
main().finally(() => prisma.$disconnect());
