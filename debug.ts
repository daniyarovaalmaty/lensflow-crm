import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const o = await prisma.order.findUnique({ where: { orderNumber: 'AG16' }, include: { organization: true } });
    console.log('ORDER:', o?.orderNumber, 'orgId:', o?.organizationId, 'type:', o?.organization?.type);
}
main();
