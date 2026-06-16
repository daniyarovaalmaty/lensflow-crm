import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { amount, clinicId } = await req.json();
        const targetClinicId = clinicId || session.user.organizationId;
        
        if (typeof amount !== 'number' || amount < 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Find or create the manual campaign
        let campaign = await prisma.marketingCampaign.findFirst({
            where: { campaignId: 'manual_spend', clinicId: targetClinicId }
        });

        if (campaign) {
            await prisma.marketingCampaign.update({
                where: { id: campaign.id },
                data: { totalSpend: amount }
            });
        } else {
            await prisma.marketingCampaign.create({
                data: {
                    campaignId: 'manual_spend',
                    name: 'Ручной ввод расходов',
                    source: 'manual',
                    status: 'active',
                    dailyBudget: 0,
                    totalSpend: amount,
                    clinicId: targetClinicId
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Failed to update manual spend:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
