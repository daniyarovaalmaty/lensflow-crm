import 'dotenv/config';
import { prisma } from './src/lib/db/prisma';
import { ItigrisApiClient } from './src/lib/itigris/client';

async function test() {
    const orgs = await prisma.organization.findMany();
    const org = orgs.find((o: any) => o.metadata?.itigris?.company === 'optika_narodnaya');
    if (!org) return console.log('No org');
    const itg = (org as any).metadata?.itigris;
    
    const api = new ItigrisApiClient({ company: itg.company, login: itg.login, password: itg.password, departmentId: 1000000001, organizationId: '' });
    try {
        const ok = await api.signInToDepartment(1000000001);
        if (ok) {
            const depts = await api.getDepartments();
            console.log('Departments:', depts.map(d => `${d.id}: ${d.name}`));
        }
    } catch (e) {
        console.error('Err:', e);
    } finally {
        await prisma.$disconnect();
    }
}
test();
