import prisma from './src/lib/db/prisma';

async function main() {
    const orgCount = await prisma.organization.count();
    const userCount = await prisma.user.count();
    const productCount = await prisma.opticProduct.count();
    const stockCount = await prisma.stockItem.count();
    const orderCount = await prisma.order.count();
    
    console.log(`DB Sanity Check:`);
    console.log(`Organizations: ${orgCount}`);
    console.log(`Users: ${userCount}`);
    console.log(`Products: ${productCount}`);
    console.log(`Stock Items: ${stockCount}`);
    console.log(`Orders: ${orderCount}`);
}
main();
