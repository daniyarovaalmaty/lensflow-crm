import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const order = await prisma.order.findUnique({
        where: { orderNumber: 'A-84' },
        select: { documentNameOd: true, documentNameOs: true }
    });
    
    console.log('Order A-84:', order);
    process.exit(0);
}

main();
