import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const manager = await prisma.user.findUnique({ where: { email: 'optika.narodnaya.astana@gmail.com' }, include: { organization: true } });
    if (!manager) return console.log('Manager not found');
    console.log('Manager org:', manager.organization?.id, 'type:', manager.organization?.type, 'parent:', manager.organization?.parentId);
    
    const orgId = manager.organizationId;
    const orders = await prisma.order.findMany({ where: { organizationId: orgId } });
    console.log('Orders in this org:', orders.length);

    const procurement = await prisma.user.findUnique({ where: { email: 'zakazy.optika.narodnaya@gmail.com' } });
    console.log('Procurement org:', procurement?.organizationId);
    
    // Check all orders
    const allOrders = await prisma.order.findMany({ select: { id: true, orderNumber: true, organizationId: true, createdById: true }});
    console.log('Total orders in DB:', allOrders.length);
    console.log('Sample orders:', allOrders.slice(0, 5));
}
main().catch(console.error).finally(() => prisma.$disconnect());
