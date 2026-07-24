import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    console.log('--- Searching for eye or max ---');
    const orgs = await prisma.organization.findMany({
        where: {
            OR: [
                { name: { contains: 'eye', mode: 'insensitive' } },
                { name: { contains: 'max', mode: 'insensitive' } },
                { name: { contains: 'айм', mode: 'insensitive' } },
                { name: { contains: 'макс', mode: 'insensitive' } }
            ]
        },
        select: { id: true, name: true, type: true }
    });
    console.log(orgs);
    if (orgs.length === 0) return;

    const orgIds = orgs.map(o => o.id);
    const recentOrders = await prisma.order.findMany({
        where: { organizationId: { in: orgIds } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { 
            id: true, 
            orderNumber: true, 
            status: true, 
            createdAt: true, 
            createdBy: { select: { fullName: true, role: true, subRole: true } },
            organization: { select: { name: true } },
            branch: { select: { name: true } }
        }
    });
    console.log('\n--- Recent Orders ---');
    console.log(JSON.stringify(recentOrders, null, 2));

    console.log('\n--- Accountants ---');
    const accountants = await prisma.user.findMany({
        where: { 
            organizationId: { in: orgIds },
            subRole: 'optic_accountant'
        },
        select: { id: true, fullName: true, email: true, branches: true, organizationId: true }
    });
    console.log(JSON.stringify(accountants, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
