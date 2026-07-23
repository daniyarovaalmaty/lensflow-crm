import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const org = await prisma.organization.findFirst({ where: { name: 'Оптика Народная' } });
    if (!org) return;

    const result = await prisma.order.updateMany({
        where: {
            organizationId: org.id,
            source: 'itigris',
            status: { not: 'delivered' }
        },
        data: {
            status: 'delivered'
        }
    });

    console.log(`Archived ${result.count} Itigris orders in LensFlow (set status to delivered).`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
