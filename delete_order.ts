import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from './src/lib/db/prisma';

async function main() {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    const order = await prisma.order.findUnique({ where: { orderNumber: 'AC76' } });
    if (order) {
        await prisma.order.delete({ where: { id: order.id } });
        console.log('Order deleted:', order.orderNumber);
    } else {
        console.log('Order AC76 not found');
    }
}
main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
