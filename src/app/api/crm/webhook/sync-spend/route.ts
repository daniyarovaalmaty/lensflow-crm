import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { campaignId, name, source, dailyBudget, spendDate, amount } = body;

        if (!campaignId || !name || !source || amount === undefined) {
            return NextResponse.json({
                error: 'Missing required parameters (campaignId, name, source, amount)'
            }, { status: 400 });
        }

        // 1. Get or create MarketingCampaign
        let campaign = await prisma.marketingCampaign.findUnique({
            where: { campaignId }
        });

        if (!campaign) {
            campaign = await prisma.marketingCampaign.create({
                data: {
                    campaignId,
                    name,
                    source,
                    dailyBudget: Number(dailyBudget) || 0,
                    status: 'active'
                }
            });
        } else {
            // Update name and budget
            campaign = await prisma.marketingCampaign.update({
                where: { campaignId },
                data: {
                    name,
                    dailyBudget: Number(dailyBudget) || campaign.dailyBudget
                }
            });
        }

        // 2. Register AdSpend record
        const dateObj = spendDate ? new Date(spendDate) : new Date();
        // Reset time to midnight to represent daily spend
        dateObj.setHours(0, 0, 0, 0);

        const adSpend = await prisma.adSpend.upsert({
            where: {
                campaignId_spendDate: {
                    campaignId: campaign.id,
                    spendDate: dateObj
                }
            },
            update: {
                amount: Number(amount)
            },
            create: {
                campaignId: campaign.id,
                spendDate: dateObj,
                amount: Number(amount)
            }
        });

        // 3. Recalculate and update MarketingCampaign total spend
        const total = await prisma.adSpend.aggregate({
            where: { campaignId: campaign.id },
            _sum: { amount: true }
        });

        await prisma.marketingCampaign.update({
            where: { id: campaign.id },
            data: {
                totalSpend: total._sum.amount || 0
            }
        });

        return NextResponse.json({
            success: true,
            campaignId: campaign.id,
            totalSpend: total._sum.amount || 0,
            adSpendId: adSpend.id
        }, { status: 200 });
    } catch (err: any) {
        console.error('Webhook sync-spend error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
