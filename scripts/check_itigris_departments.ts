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
            const departments = await client.getDepartments();
            console.log("Departments:");
            for (const d of departments) {
                console.log(`- ${d.id}: ${d.name} (${d.city || 'no city'})`);
            }
        } catch (e: any) {
            console.error('Error:', e.response?.data || e.message);
        }
    }
}
main().finally(() => prisma.$disconnect());
