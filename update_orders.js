const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'azamat.ivdh@gmail.com' },
        include: { organization: true }
    });
    console.log("User:", user?.fullName, "Org:", user?.organization?.name, "OrgId:", user?.organizationId);

    const ckk = await prisma.organization.findFirst({
        where: { name: { contains: 'ЦКК' } }
    });
    console.log("CKK Org:", ckk?.name, "ID:", ckk?.id);

    const orders = await prisma.order.findMany({
        where: { createdById: user?.id }
    });
    console.log(`Found ${orders.length} orders for Azamat`);
    
    let nullOrgs = 0;
    for (const o of orders) {
        if (!o.organizationId) nullOrgs++;
    }
    console.log(`${nullOrgs} orders have null organizationId`);

    if (ckk) {
        const res = await prisma.order.updateMany({
            where: { createdById: user?.id },
            data: { organizationId: ckk.id }
        });
        console.log(`Updated ${res.count} orders to belong to CKK`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
