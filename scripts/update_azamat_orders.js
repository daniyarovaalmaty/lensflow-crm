const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'azamat.ivdh@gmail.com' }
    });
    console.log("User:", user?.fullName);

    const ckk = await prisma.organization.findFirst({
        where: { name: { contains: 'ЦКК' }, type: 'distributor' }
    });
    console.log("CKK Org:", ckk?.name, "ID:", ckk?.id);

    if (user && ckk) {
        const res = await prisma.order.updateMany({
            where: { createdById: user.id },
            data: { organizationId: ckk.id }
        });
        console.log(`Updated ${res.count} orders to belong to CKK`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
