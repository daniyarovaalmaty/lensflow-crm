const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const prisma = new PrismaClient();

async function main() {
    const filePath = '/Users/daniyarovaruslanovna/Downloads/Medinnovation Склад 01.01.2026.xlsx';
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {header: 1});

    // Find distributor
    const distOrg = await prisma.organization.findFirst({
        where: { type: 'distributor' }
    });

    if (!distOrg) {
        console.log("No distributor org found!");
        return;
    }
    console.log("Distributor Org ID:", distOrg.id, "Name:", distOrg.name);

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;

        const name = row[0];
        const qty = parseInt(row[2]) || 0;

        console.log(`Adding ${name} (Qty: ${qty})`);
        
        const product = await prisma.opticProduct.create({
            data: {
                organizationId: distOrg.id,
                name: name,
                category: 'solution', // Setting solution as a default for these items
                type: 'product',
                currentStock: qty,
                trackSerials: true, // The user requested serial numbers for tracking
                isActive: true
            }
        });

        // Create a single document receipt for this initial stock
        const doc = await prisma.stockDocument.create({
            data: {
                documentNumber: `INIT-${Date.now()}-${i}`,
                organizationId: distOrg.id,
                type: 'receipt',
                status: 'confirmed',
                totalAmount: 0,
                items: [{
                    productId: product.id,
                    name: product.name,
                    qty: qty,
                    price: 0
                }],
                confirmedAt: new Date()
            }
        });

        // Add movement
        await prisma.stockMovement.create({
            data: {
                organizationId: distOrg.id,
                productId: product.id,
                type: 'receipt',
                quantity: qty,
                documentId: doc.id,
                reason: 'Initial Import from Excel'
            }
        });

        // Create StockItems
        // the user said: "all positions must be accounted for by serial numbers (but we must leave the possibility of accounting without a serial number)"
        // This probably means they want the actual items created without serial numbers for now, but `trackSerials: true`.
        if (qty > 0) {
            // Since some quantities are up to 2788, chunk the createMany to avoid exceeding query parameter limits.
            const chunkSize = 500;
            const allStockItems = Array.from({ length: qty }).map(() => ({
                productId: product.id,
                organizationId: distOrg.id,
                status: 'in_stock',
                serialNumber: null,
                receiptDocId: doc.id
            }));
            
            for (let j = 0; j < allStockItems.length; j += chunkSize) {
                const chunk = allStockItems.slice(j, j + chunkSize);
                await prisma.stockItem.createMany({ data: chunk });
            }
        }
    }
    console.log("Done successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
