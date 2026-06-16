import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            name, phone, city, source, campaignId,
            utmSource, utmMedium, utmCampaign, utmContent, utmTerm
        } = body;

        if (!phone) {
            return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
        }

        // Look up campaign if campaignId is provided
        let campaign = null;
        if (campaignId) {
            campaign = await prisma.marketingCampaign.findFirst({
                where: { campaignId }
            });
        }

        // Check if lead already exists in the sales funnel
        const existing = await prisma.lead.findFirst({
            where: { phone, funnel: 'sales' }
        });

        if (existing) {
            // Already exists — return success with existing lead ID to prevent duplicates
            return NextResponse.json({
                message: 'Lead already exists',
                leadId: existing.id
            }, { status: 200 });
        }

        // Get first clinic Organization to link by default
        const defaultClinic = await prisma.organization.findFirst();

        // Create new lead
        const lead = await prisma.lead.create({
            data: {
                phone,
                name: name || 'Новый лид',
                city: city || null,
                source: source || (campaign?.source as any) || 'website',
                funnel: 'sales',
                stage: 'new_lead',
                campaignId: campaign?.id || null,
                clinicId: defaultClinic?.id || null,
                utmSource: utmSource || '',
                utmMedium: utmMedium || '',
                utmCampaign: utmCampaign || '',
                utmContent: utmContent || '',
                utmTerm: utmTerm || ''
            }
        });

        // Log activity
        await prisma.leadActivity.create({
            data: {
                leadId: lead.id,
                action: 'created',
                details: `Лид привлечен автоматически. Рекламный источник: ${lead.source}. Кампания: ${campaign?.name || 'UTM'}`
            }
        });

        return NextResponse.json({
            success: true,
            leadId: lead.id
        }, { status: 201 });
    } catch (err: any) {
        console.error('Webhook lead creation error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
