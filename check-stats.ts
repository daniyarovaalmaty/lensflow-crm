import prisma from './src/lib/db/prisma';

async function main() {
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    if (!orgId) return;

    const products = await prisma.opticProduct.count({ where: { organizationId: orgId } });
    const stockItems = await prisma.stockItem.count({ where: { organizationId: orgId } });
    const organizations = await prisma.organization.count();
    
    const stock = await prisma.stockItem.findMany({ 
        where: { organizationId: orgId },
        include: { product: true }
    });
    
    let totalPurchaseValue = 0;
    let totalRetailValue = 0;
    
    for (let item of stock) {
        totalPurchaseValue += Number(item.purchasePrice || 0);
        totalRetailValue += Number(item.product.retailPrice || 0);
    }

    console.log(`Products: ${products}`);
    console.log(`Stock Items: ${stockItems}`);
    console.log(`Organizations (Контрагенты): ${organizations}`);
    console.log(`Total Purchase Value: ${totalPurchaseValue}`);
    console.log(`Total Retail Value: ${totalRetailValue}`);
}
main();
