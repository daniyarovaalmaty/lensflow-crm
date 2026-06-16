import 'dotenv/config';
import prisma from './src/lib/db/prisma';

async function main() {
    const campaigns = await prisma.marketingCampaign.findMany();
    console.log('Campaigns:', campaigns);
}
main().catch(console.error).finally(() => prisma.$disconnect());
