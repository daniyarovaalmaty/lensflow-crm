import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const org = await prisma.organization.findFirst({ where: { name: 'Оптика Народная' } });
    const meta: any = org?.metadata;
    if (meta?.itigris) {
        const { ItigrisApiClient } = await import('../src/lib/itigris/client');
        const client = new ItigrisApiClient({
            company: meta.itigris.company,
            login: meta.itigris.login,
            password: meta.itigris.password,
            departmentId: meta.itigris.departmentId,
            organizationId: org.id
        });
        
        try {
            await client.signIn();
            await client.signInToDepartment(meta.itigris.departmentId);
            const { totalElements } = await client.getDepartmentOrders(0, 1);
            console.log(`Total orders in Itigris for this department: ${totalElements}`);
            
            const localOrders = await prisma.order.count({
                where: { organizationId: org.id, source: 'itigris' }
            });
            console.log(`Total synced to LensFlow: ${localOrders}`);
            console.log(`Remaining to sync: ${totalElements - localOrders}`);
            
        } catch (e: any) {
            console.error('Error:', e.response?.data || e.message);
        }
    }
}
main().finally(() => prisma.$disconnect());
