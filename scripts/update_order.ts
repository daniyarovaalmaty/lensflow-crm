import 'dotenv/config';
import prisma from '../src/lib/db/prisma';

async function main() {
    const orderNumber = 'ITG-1000502943';
    console.log(`Updating order ${orderNumber} to delivered...`);
    
    const updated = await prisma.order.update({
        where: { orderNumber },
        data: { status: 'delivered' }
    });
    
    console.log('Updated order:', updated.orderNumber, 'New status:', updated.status);
}

main().catch(console.error).finally(() => prisma.$disconnect());
