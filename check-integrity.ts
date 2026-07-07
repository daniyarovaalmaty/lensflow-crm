import prisma from './src/lib/db/prisma';

async function main() {
    console.log("--- DB INTEGRITY CHECK ---");
    
    // Users
    const totalUsers = await prisma.user.count();
    console.log(`Total Users: ${totalUsers}`);
    
    // Organizations
    const totalOrgs = await prisma.organization.count();
    console.log(`Total Organizations: ${totalOrgs}`);
    
    // Orders
    const totalOrders = await prisma.order.count();
    console.log(`Total Orders: ${totalOrders}`);
    
    // Patients
    const totalPatients = await prisma.patient.count();
    console.log(`Total Patients: ${totalPatients}`);
    
    // Total Products & Stock
    const totalProducts = await prisma.opticProduct.count();
    const totalStock = await prisma.stockItem.count();
    console.log(`Total Products: ${totalProducts}`);
    console.log(`Total Stock Items: ${totalStock}`);

    // Let's verify that the target org has the exact counts we expect, 
    // and see how many belong to others.
    const medInnovation = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' }
    });
    const orgId = medInnovation?.organizationId;
    
    if (orgId) {
        const orgProducts = await prisma.opticProduct.count({ where: { organizationId: orgId } });
        const orgStock = await prisma.stockItem.count({ where: { organizationId: orgId } });
        
        console.log(`--- ORG SPECIFIC ---`);
        console.log(`Target Org Products: ${orgProducts}`);
        console.log(`Target Org Stock: ${orgStock}`);
        
        console.log(`--- OTHER ORGS ---`);
        console.log(`Other Orgs Products: ${totalProducts - orgProducts}`);
        console.log(`Other Orgs Stock: ${totalStock - orgStock}`);
    }
}
main();
