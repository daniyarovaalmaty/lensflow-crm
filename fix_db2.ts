import prisma from './src/lib/db/prisma';

async function main() {
    const orgId = 'cmr4nrk53000004ie2202u79h';
    const olderDocId = 'cmroy7i4t000004l45tvtjypo'; // 17.07.2026
    const newerDocId = 'cmrt7ko56000104la4v8xa71t'; // 20.07.2026 (duplicate)

    const batch1Id = 'cmroy7im9000104l4spabfr99';
    const batch2Id = 'cmroy7j7a000304l4xl8mjo7e';

    const oldProduct1Id = 'cmroxu3gj000604jp31yd3svg'; // AJL Ferrara Ring AFR6
    const oldProduct2Id = 'cmroxz2o7000704jp51fcy3mg'; // AJL-RING AFR
    const newProduct1Id = 'cmrsy0mhi002dd0xdjao0hf2r'; // СЕГМЕНТ ИНТРАСТРОМАЛЬНЫЙ...
    const newProduct2Id = 'cmrsy0eug001qd0xd0ld1az1y'; // ИНТРАСТРОМАЛЬНЫЙ СЕГМЕНТ...

    // Fetch both docs
    const newerDoc = await prisma.stockDocument.findUnique({ where: { id: newerDocId } });
    if (!newerDoc) {
        console.log("Newer doc already deleted?");
        return;
    }

    await prisma.$transaction(async (tx) => {
        // 1. Update Older Doc's items JSON to match the newer doc's items
        await tx.stockDocument.update({
            where: { id: olderDocId },
            data: { items: newerDoc.items as any }
        });

        // 2. Delete Newer Doc (and satisfy Tenant Isolation)
        // Note: For single deletes `delete` might need organizationId if strictly checked? No, delete is by ID.
        await tx.stockDocument.delete({ where: { id: newerDocId } });

        // 3. Move Batch 1 to New Product 1 and reset quantity
        await tx.stockItem.update({
            where: { id: batch1Id },
            data: { productId: newProduct1Id, quantity: 1 }
        });

        // 4. Move Batch 2 to New Product 2 and reset quantity
        await tx.stockItem.update({
            where: { id: batch2Id },
            data: { productId: newProduct2Id, quantity: 1 }
        });

        // 5. Update Old Products' stock to 0
        await tx.opticProduct.update({
            where: { id: oldProduct1Id },
            data: { currentStock: 0 }
        });
        await tx.opticProduct.update({
            where: { id: oldProduct2Id },
            data: { currentStock: 0 }
        });

        // 6. Delete StockMovements of the Newer Doc
        await tx.stockMovement.deleteMany({
            where: { 
                documentId: newerDocId,
                organizationId: orgId 
            }
        });

        // 7. Update StockMovements of the Older Doc
        const logs = await tx.stockMovement.findMany({
            where: { documentId: olderDocId }
        });
        for (const log of logs) {
            if (log.productId === oldProduct1Id) {
                await tx.stockMovement.update({
                    where: { id: log.id },
                    data: { productId: newProduct1Id }
                });
            } else if (log.productId === oldProduct2Id) {
                await tx.stockMovement.update({
                    where: { id: log.id },
                    data: { productId: newProduct2Id }
                });
            }
        }
    });

    console.log("Database fixed successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
