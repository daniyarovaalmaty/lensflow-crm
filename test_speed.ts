import 'dotenv/config';
import prisma from './src/lib/db/prisma';
import { ItigrisRemoteClient } from './src/lib/itigris';

async function main() {
    const orgId = 'cmowv0aio000204la3rf3ff0f';
    const org = await prisma.organization.findUnique({
        where: { id: orgId }
    });

    const meta = (org as any).metadata || {};
    const remoteConf = meta.itigrisRemote;
    const remoteClient = new ItigrisRemoteClient({ client: remoteConf.client, key: remoteConf.key });
    
    const start = Date.now();
    let page = 1;
    let totalItems = 0;
    let hasMore = true;
    while (hasMore && page < 200) {
        const promises = [];
        for (let p = 0; p < 5; p++) {
            promises.push(remoteClient.remainsList('lenses', undefined, page + p));
        }
        const results = await Promise.all(promises);
        for (let i = 0; i < results.length; i++) {
            const rows = results[i];
            if (!rows || rows.length === 0) {
                hasMore = false;
                break;
            }
            totalItems += rows.length;
            if (rows.length < 1000) {
                hasMore = false;
                break;
            }
        }
        page += 5;
    }
    console.log(`Cat: lenses, Pages fetched: ${page - 1}, Items: ${totalItems}, Time: ${Date.now() - start}ms`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
