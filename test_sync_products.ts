import 'dotenv/config';
const { Client } = require('pg');
import prisma from './src/lib/db/prisma';
import { ItigrisApiClient, ItigrisRemoteClient } from './src/lib/itigris';
import { ItigrisSyncService } from './src/lib/itigris/sync';

async function main() {
    const orgId = 'cmowv0aio000204la3rf3ff0f';
    const org = await prisma.organization.findUnique({
        where: { id: orgId }
    });

    if (!org) {
        console.log("Org not found");
        return;
    }

    console.log("Org found:", org.id, org.name);

    const meta = (org as any).metadata || {};
    
    // Test 1: v2 syncProducts (Товары)
    const itigris = meta.itigris;
    if (itigris?.company && itigris?.login && itigris?.password) {
        const config = {
            company: itigris.company,
            login: itigris.login,
            password: itigris.password,
            departmentId: Number(itigris.departmentId) || 0,
            organizationId: org.id,
        };

        console.log("Running syncProducts (v2)...");
        const apiClient = new ItigrisApiClient(config);
        const syncService = new ItigrisSyncService(apiClient, prisma as any, org.id);
        
        try {
            const result = await syncService.syncProducts();
            console.log("v2 result:", JSON.stringify(result, null, 2));
        } catch (e) {
            console.error("v2 error:", e);
        }
    } else {
        console.log("v2 ITIGRIS not configured");
    }

    // Test 2: Legacy syncProducts (Товары RemoteAPI)
    const remoteConf = meta.itigrisRemote;
    if (remoteConf?.client && remoteConf?.key) {
        console.log("Running syncProductsLegacy (RemoteAPI)...");
        const remoteClient = new ItigrisRemoteClient({ client: remoteConf.client, key: remoteConf.key });
        const syncService = new ItigrisSyncService(null as any, prisma as any, org.id);
        
        try {
            const result = await syncService.syncProductsLegacy(remoteClient);
            console.log("Legacy result:", JSON.stringify(result, null, 2));
        } catch (e) {
            console.error("Legacy error:", e);
        }
    } else {
        console.log("Legacy RemoteAPI not configured");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
