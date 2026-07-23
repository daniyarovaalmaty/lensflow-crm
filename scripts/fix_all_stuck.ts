import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    let total = 0;
    for (const org of orgs) {
        const res = await prisma.order.updateMany({
            where: {
                organizationId: org.id,
                source: 'itigris',
                status: { in: ['new_order', 'in_production', 'ready'] }
            },
            data: {
                status: 'delivered'
            }
        });
        total += res.count;
    }
    console.log(`Successfully moved ${total} old Itigris orders to delivered (Archive).`);
}

main().catch(console.error);
