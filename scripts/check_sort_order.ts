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
            const page0 = await client.getDepartmentOrders(0, 1);
            console.log(`Page 0, Item 0 date: ${page0.content[0]?.registrationDate}`);
            
            console.log("Fetching last page...");
            const lastPageIdx = Math.floor(page0.totalElements / 1) - 1;
            const lastPage = await client.getDepartmentOrders(lastPageIdx, 1);
            console.log(`Last Page, Item 0 date: ${lastPage.content[0]?.registrationDate}`);
            
        } catch (e: any) {
            console.error('Error:', e.response?.data || e.message);
        }
    }
}
main().finally(() => prisma.$disconnect());
