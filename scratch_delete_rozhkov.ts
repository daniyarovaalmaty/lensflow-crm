import prisma from './src/lib/db/prisma';

async function main() {
    const ordersToDelete = ['AB33', 'AB34', 'AB35', 'AB36', 'AB45', 'AB49', 'AB51', 'AB75', 'AB77'];
    
    console.log(`Deleting orders: ${ordersToDelete.join(', ')}`);
    
    const result = await prisma.order.deleteMany({
        where: {
            orderNumber: {
                in: ordersToDelete
            }
        }
    });
    
    console.log(`Successfully deleted ${result.count} orders.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
