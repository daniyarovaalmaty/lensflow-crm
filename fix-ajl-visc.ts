import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    // Find the two products
    const pExpired = await prisma.opticProduct.findFirst({
        where: { organizationId: orgId, name: { contains: 'серия 00B01105 до 05/2022' } }
    });
    
    // For the regular one, make sure it DOES NOT contain "серия"
    const pRegular = await prisma.opticProduct.findFirst({
        where: { 
            organizationId: orgId, 
            name: { contains: 'AJL VISC 2%', not: { contains: 'серия' } } 
        }
    });

    if (pExpired && pRegular) {
        console.log(`Found Expired: ${pExpired.name} (Stock: ${pExpired.currentStock})`);
        console.log(`Found Regular: ${pRegular.name} (Stock: ${pRegular.currentStock})`);

        // Move all stock items from pExpired to pRegular
        const updatedItems = await prisma.stockItem.updateMany({
            where: { productId: pExpired.id, organizationId: orgId },
            data: { productId: pRegular.id }
        });
        
        console.log(`Moved ${updatedItems.count} stock items to Regular.`);

        // Update product currentStock counts
        await prisma.opticProduct.update({
            where: { id: pExpired.id },
            data: { 
                currentStock: 0,
                purchasePrice: 0,
                retailPrice: 0
            }
        });

        await prisma.opticProduct.update({
            where: { id: pRegular.id },
            data: { currentStock: pRegular.currentStock + updatedItems.count }
        });

        console.log(`Done!`);
    } else {
        console.log("Could not find both products.", { pExpired: !!pExpired, pRegular: !!pRegular });
    }
}
main();
