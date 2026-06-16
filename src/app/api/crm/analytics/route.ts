import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
        if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

        const clinicId = user.organizationId;

        const whereClause: any = { funnel: 'sales', clinicId };

        // 1. Fetch all leads and counts
        const leads = await prisma.lead.findMany({
            where: whereClause,
            select: {
                id: true,
                stage: true,
                source: true,
                acquisitionCost: true,
                revenue: true,
                campaignId: true
            }
        });

        const totalLeads = leads.length;
        const totalConverted = leads.filter(l => l.stage === 'converted').length;
        const conversionRate = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : '0';

        // 2. Fetch marketing campaigns and spends
        const campaigns = await prisma.marketingCampaign.findMany({
            where: { clinicId: clinicId ? clinicId : undefined },
            include: {
                spends: true
            }
        });

        const manualCampaign = campaigns.find((c: any) => c.campaignId === 'manual_spend');
        const hasManualCampaign = !!manualCampaign;
        
        let totalBudgetSpent = 0;
        if (hasManualCampaign) {
            totalBudgetSpent = manualCampaign.totalSpend;
        } else {
            const totalCampaignSpend = campaigns.reduce((acc: number, c: any) => acc + c.totalSpend, 0);
            const totalManualSpend = leads.reduce((acc: number, l: any) => acc + (l.acquisitionCost || 0), 0);
            totalBudgetSpent = totalCampaignSpend + totalManualSpend;
        }

        // 3. CAC and LTV/Revenue
        const cac = totalConverted > 0 ? Math.round(totalBudgetSpent / totalConverted) : totalBudgetSpent;
        const totalRevenue = leads.reduce((acc: number, l: any) => acc + (l.revenue || 0), 0);

        // 4. ROI (ROMI)
        const roi = totalBudgetSpent > 0 ? Math.round(((totalRevenue - totalBudgetSpent) / totalBudgetSpent) * 100) : 0;
        const avgLeadCost = totalLeads > 0 ? Math.round(totalBudgetSpent / totalLeads) : 0;

        // 5. Funnel Stages Breakdown
        const stages = await prisma.lead.groupBy({
            by: ['stage'],
            where: whereClause,
            _count: { _all: true }
        });

        const stagesCounts = stages.reduce((acc: any, s) => {
            acc[s.stage] = s._count._all;
            return acc;
        }, {});

        const funnel = [
            { stage: 'new_lead', label: 'Новые', value: stagesCounts['new_lead'] || 0 },
            { stage: 'contacted', label: 'Связались', value: stagesCounts['contacted'] || 0 },
            { stage: 'qualified', label: 'Квалифицирован', value: stagesCounts['qualified'] || 0 },
            { stage: 'appointment', label: 'Записан', value: stagesCounts['appointment'] || 0 },
            { stage: 'visited', label: 'Пришёл', value: stagesCounts['visited'] || 0 },
            { stage: 'converted', label: 'Конвертирован', value: stagesCounts['converted'] || 0 },
            { stage: 'lost', label: 'Потерян', value: stagesCounts['lost'] || 0 }
        ];

        // 6. Marketing Channels performance compare
        const sources = ['whatsapp', 'instagram', 'website', 'manual', 'referral'];
        const sourcesPerf = sources.map(src => {
            const srcLeads = leads.filter(l => l.source === src);
            const srcTotal = srcLeads.length;
            
            if (srcTotal === 0) return null;

            const srcConv = srcLeads.filter(l => l.stage === 'converted').length;
            const srcManualSpend = hasManualCampaign ? 0 : srcLeads.reduce((acc: number, l: any) => acc + (l.acquisitionCost || 0), 0);
            
            // Map campaigns associated with source
            const srcCampaigns = campaigns.filter((c: any) => 
                (c.source === 'facebook' && ['instagram', 'whatsapp'].includes(src)) ||
                (c.source === 'google' && src === 'website')
            );
            const srcCampaignSpend = srcCampaigns.reduce((acc: number, c: any) => acc + c.totalSpend, 0);
            const srcSpend = srcManualSpend + srcCampaignSpend;
            
            const srcRev = srcLeads.reduce((acc: number, l: any) => acc + (l.revenue || 0), 0);
            const srcCac = srcConv > 0 ? Math.round(srcSpend / srcConv) : srcSpend;
            const srcRoi = srcSpend > 0 ? Math.round(((srcRev - srcSpend) / srcSpend) * 100) : 0;

            return {
                source: src,
                label: src === 'whatsapp' ? 'WhatsApp' : src === 'instagram' ? 'Instagram' : src === 'website' ? 'Google / Сайт' : src === 'manual' ? 'Вручную' : 'Рекомендация',
                leads: srcTotal,
                converted: srcConv,
                spend: srcSpend,
                revenue: srcRev,
                cac: srcCac,
                roi: srcRoi
            };
        }).filter(Boolean);

        return NextResponse.json({
            kpi: {
                totalLeads,
                totalConverted,
                conversionRate,
                totalBudgetSpent,
                cac,
                totalRevenue,
                roi,
                avgLeadCost
            },
            funnel,
            sources: sourcesPerf,
            campaigns: campaigns.map((c: any) => ({
                id: c.id,
                campaignId: c.campaignId,
                name: c.name,
                source: c.source,
                status: c.status,
                dailyBudget: c.dailyBudget,
                totalSpend: c.totalSpend,
                leadsCount: leads.filter((l: any) => l.campaignId === c.id).length
            }))
        });
    } catch (err: any) {
        console.error('Failed to calculate analytics:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
