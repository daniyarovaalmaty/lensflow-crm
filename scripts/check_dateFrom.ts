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
            
            const dateFrom = new Date();
            dateFrom.setMonth(dateFrom.getMonth() - 6);
            const dateFromIso = dateFrom.toISOString().split('T')[0]; // Itigris usually takes YYYY-MM-DD
            
            console.log(`Fetching orders since ${dateFromIso}...`);
            const params = { page: 0, size: 1, dateFrom: dateFromIso };
            const resp = await (client as any).http.get('/orders', { params });
            
            console.log(`Total orders since 6 months ago: ${resp.data?.totalElements}`);
        } catch (e: any) {
            console.error('Error:', e.response?.data || e.message);
        }
    }
}
main().finally(() => prisma.$disconnect());
