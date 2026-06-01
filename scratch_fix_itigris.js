/**
 * Fix ITIGRIS config in DB for Demo@gmail.com account
 * Company should be "optima_demo" not "Itigris"
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find the org for Demo@gmail.com
    const user = await prisma.user.findFirst({
        where: { email: { contains: 'demo', mode: 'insensitive' } },
        include: { organization: true }
    });
    
    if (!user) {
        console.log('❌ Demo user not found');
        return;
    }
    
    console.log('User:', user.email);
    console.log('Org:', user.organization?.name, '|', user.organizationId);
    
    const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
    const meta = org?.metadata || {};
    console.log('Current ITIGRIS config:', JSON.stringify(meta?.itigris || {}, null, 2));
    
    // Fix: set company to "optima_demo"
    const updatedMeta = {
        ...meta,
        itigris: {
            ...(meta.itigris || {}),
            company: 'optima_demo',
            login: 'optima_demo',
            departmentId: 1000000007,
            connectedAt: new Date().toISOString(),
        }
    };
    
    await prisma.organization.update({
        where: { id: user.organizationId },
        data: { metadata: updatedMeta }
    });
    
    console.log('\n✅ Updated ITIGRIS config:');
    console.log(JSON.stringify(updatedMeta.itigris, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
