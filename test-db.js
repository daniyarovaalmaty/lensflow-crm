const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const products = await prisma.opticProduct.findMany({ select: { barcode: true, sku: true, currentStock: true, name: true } });
    console.log("OpticProducts:", products);
    const stockItems = await prisma.stockItem.findMany({ select: { serialNumber: true, barcode: true, status: true } });
    console.log("StockItems:", stockItems);
}
main().catch(console.error).finally(() => prisma.$disconnect());
