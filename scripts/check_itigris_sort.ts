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
            
            console.log("Fetching page 0...");
            const page0 = await client.getDepartmentOrders(0, 5);
            for (const o of page0.content) {
                console.log(`Page 0 Order ID: ${o.id}, Date: ${o.createdAt}`);
            }
            
        } catch (e: any) {
            console.error('Error:', e.response?.data || e.message);
        }
    }
}
main().finally(() => prisma.$disconnect());
