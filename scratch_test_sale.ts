import prisma from './src/lib/db/prisma';

async function main() {
    try {
        const orgs = await prisma.organization.findMany({
            where: { name: { contains: 'vision', mode: 'insensitive' } }
        });
        const orgId = orgs[0]?.id;
        console.log('Org:', orgs[0]?.name);
        
        let saleCount = await prisma.sale.count({ where: { organizationId: orgId } });
        let saleNumber = S--;
        
        console.log('Testing create sale...');
        await prisma.sale.create({
            data: {
                saleNumber,
                organizationId: orgId,
                customerName: 'Т?жі?осова Асылым',
                customerPhone: '87025032575',
                patientId: null, // we'll skip patientId for this test just to see if it fails
                leadId: null,
                doctorId: null,
                managerId: null,
                subtotal: 3000,
                discountPercent: 0,
                discountAmount: 0,
                total: 3000,
                paidAmount: 3000,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                invoiceData: null,
                performedById: 'test_user_id',
                performedByName: 'Test User',
                notes: null,
                items: {
                    create: [
                        {
                            productId: 'cm024lnt80004v0kks6q2v44t', // fake id
                            name: 'Синоптофор (1 день)',
                            category: 'Услуга',
                            quantity: 1,
                            unitPrice: 2000,
                            total: 2000,
                        },
                        {
                            productId: 'cm024lnt80005v0kks6q2v44u', // fake id
                            name: 'Засветы по Чермаку (1 день)',
                            category: 'Услуга',
                            quantity: 1,
                            unitPrice: 500,
                            total: 500,
                        },
                        {
                            productId: 'cm024lnt80006v0kks6q2v44v', // fake id
                            name: 'Макулотестер (1 день)',
                            category: 'Услуга',
                            quantity: 1,
                            unitPrice: 500,
                            total: 500,
                        }
                    ],
                },
            },
        });
        console.log('Success!');
    } catch (e) {
        console.error('Prisma Error:', e);
    }
}
main().catch(console.error);
