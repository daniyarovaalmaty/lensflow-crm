import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const mainOrg = await prisma.organization.findFirst({ where: { name: 'Оптика Народная' } });
    const kostOrg = await prisma.organization.findFirst({ where: { name: 'Оптика Народная Костанай' } });
    
    if (!mainOrg || !kostOrg) {
        console.error("Orgs not found");
        return;
    }
    
    console.log("Moving Itigris orders and patients from", mainOrg.name, "to", kostOrg.name);
    
    // Move orders
    const count = await prisma.order.updateMany({
        where: {
            organizationId: mainOrg.id,
            source: 'itigris'
        },
        data: {
            organizationId: kostOrg.id
        }
    });
    
    // Move patients
    const pCount = await prisma.patient.updateMany({
        where: {
            organizationId: mainOrg.id,
            externalId: { startsWith: 'itigris:' }
        },
        data: {
            organizationId: kostOrg.id
        }
    });

    console.log(`Successfully moved ${count.count} Itigris orders and ${pCount.count} Itigris patients to Kostanay`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
