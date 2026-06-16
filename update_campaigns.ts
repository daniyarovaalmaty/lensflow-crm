import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    await prisma.marketingCampaign.updateMany({
        where: {},
        data: { clinicId: 'org-demo-neweye' }
    });
    console.log('Updated existing campaigns to org-demo-neweye');
}

main().catch(console.error).finally(() => prisma.$disconnect());
