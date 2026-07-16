import { prisma } from './src/lib/db/prisma';
import { ItigrisRemoteClient } from './src/lib/itigris/remote';
import { ItigrisSyncService } from './src/lib/itigris/sync';

const client = new ItigrisRemoteClient({ client: 'optika_narodnaya', key: 'ae8207fa-00eb-43db-b985-06fada966196' });
const syncService = new ItigrisSyncService(null as any, prisma, 'cm5w61f4z0000r55m3t1a2y2o');

async function main() {
    try {
        const r = await syncService.syncProductsLegacy(client);
        console.log(JSON.stringify(r, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
