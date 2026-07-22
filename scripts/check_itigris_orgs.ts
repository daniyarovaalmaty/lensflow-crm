import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const orgs = await prisma.organization.findMany({
        where: { name: { contains: 'Оптика Народная' } },
        select: { id: true, name: true, metadata: true }
    });
    
    for (const org of orgs) {
        const meta: any = org.metadata || {};
        console.log(`Org: ${org.name}`);
        if (meta.itigris) {
            console.log(`  Itigris Configured: Yes`);
            console.log(`  Company: ${meta.itigris.company}`);
            console.log(`  Login: ${meta.itigris.login}`);
            console.log(`  DepartmentId: ${meta.itigris.departmentId}`);
        } else {
            console.log(`  Itigris Configured: No`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
