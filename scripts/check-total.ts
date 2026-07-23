import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const orgs = await prisma.organization.findMany({
        where: { name: { contains: 'Костанай' } }
    });

    for (const org of orgs) {
        if (!org.metadata) continue;
        const cfg = typeof org.metadata === 'string' ? JSON.parse(org.metadata).itigris : (org.metadata as any)?.itigris;
        if (!cfg || !cfg.company) continue;

        console.log("Checking for org:", org.name);

        const authRes = await fetch(`https://optima.itigris.ru/${cfg.company}/api/v2/sign/in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ company: cfg.company, login: cfg.login, password: cfg.password, departmentId: cfg.departmentId })
        });
        
        if (!authRes.ok) {
            console.error("Auth failed for", org.name);
            continue;
        }

        const auth = await authRes.json();
        const token = auth.accessToken;

        const res = await fetch(`https://optima.itigris.ru/${cfg.company}/api/v2/orders?departmentId=${cfg.departmentId}&page=0&size=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        console.log("Total orders in Itigris for Kostanay:", data.totalElements);

        const countDB = await prisma.order.count({
            where: { organizationId: org.id, source: 'itigris' }
        });
        console.log("Total orders in DB for Kostanay:", countDB);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
