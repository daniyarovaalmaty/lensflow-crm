import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
    const { default: prisma } = await import('./src/lib/db/prisma');
    const { ItigrisApiClient, ItigrisSyncService } = await import('./src/lib/itigris');
    console.log('Starting mass import of Itigris orders as ARCHIVED (delivered)...');
    try {
        const orgs = await prisma.organization.findMany();
        let found = false;

        for (const org of orgs) {
            const itigris = (org.metadata as any)?.itigris;
            if (itigris?.company && itigris?.login && itigris?.password) {
                found = true;
                console.log(`Connecting to Itigris for org ${org.id} (${org.name})...`);
                
                const client = new ItigrisApiClient({
                    company: itigris.company,
                    login: itigris.login,
                    password: itigris.password,
                    departmentId: Number(itigris.departmentId) || 0,
                    organizationId: org.id
                });
                
                const svc = new ItigrisSyncService(client, prisma as any, org.id);
                
                console.log(`Pulling all orders and forcing status to "delivered"...`);
                const result = await svc.syncOrders({ forceStatus: 'delivered', skipExisting: true });
                
                console.log('Sync Result:', result);
            }
        }

        if (!found) {
            console.log('No Itigris credentials found in any organization.');
        }

    } catch (e) {
        console.error('Error during import:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
