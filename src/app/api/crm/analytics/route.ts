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
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

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

        // 7. Extra analytics by doctors and services based on POS Sales (for users who didn't use the calendar)
        const currentMonthSales = await prisma.sale.findMany({
            where: {
                organizationId: clinicId,
                createdAt: { gte: startOfMonth }
            },
            include: {
                items: true,
                patient: {
                    include: { doctor: true }
                }
            }
        });

        // 8. Fetch appointments for the same month to calculate Calendar Conversion
        const currentMonthAppointments = await prisma.appointment.findMany({
            where: {
                clinicId,
                date: { gte: startOfMonth }
            },
            include: {
                doctor: true
            }
        });

        const allDoctors = await prisma.user.findMany({
            where: { organizationId: clinicId, role: 'doctor' }
        });

        const docStats: Record<string, { count: number, revenue: number, appointmentsCount: number, salesCount: number }> = {};
        allDoctors.forEach(doc => {
            const doctorName = doc.fullName || 'Без имени';
            docStats[doctorName] = { count: 0, revenue: 0, appointmentsCount: 0, salesCount: 0 };
        });

        const srvStats: Record<string, { count: number, revenue: number }> = {};

        // Process Appointments
        currentMonthAppointments.forEach(appt => {
            const doctorName = appt.doctor?.fullName || 'Неизвестный врач';
            if (!docStats[doctorName]) docStats[doctorName] = { count: 0, revenue: 0, appointmentsCount: 0, salesCount: 0 };
            docStats[doctorName].appointmentsCount += 1;
        });

        // Process Sales (and link to Doctors if possible)
        currentMonthSales.forEach(sale => {
            // How do we link sale to doctor? 
            // If the patient had an appointment this month, attribute to that doctor.
            let assignedDoctorName = null;
            if (sale.patientId) {
                const appt = currentMonthAppointments.find(a => a.patientId === sale.patientId);
                if (appt) assignedDoctorName = appt.doctor?.fullName || 'Неизвестный врач';
            }
            if (!assignedDoctorName) {
                // Try matching by name (fuzzy)
                const apptByName = currentMonthAppointments.find(a => {
                    if (!a.patientName || !sale.customerName) return false;
                    const aName = a.patientName.toLowerCase().trim();
                    const sName = sale.customerName.toLowerCase().trim();
                    // Split names into parts and check if there's any intersection of words longer than 3 chars
                    const aParts = aName.split(' ').filter(p => p.length >= 3);
                    const sParts = sName.split(' ').filter(p => p.length >= 3);
                    
                    if (aParts.length > 0 && sParts.length > 0) {
                        return aParts.some(ap => sParts.some(sp => ap.includes(sp) || sp.includes(ap)));
                    }
                    
                    return aName.includes(sName) || sName.includes(aName);
                });
                if (apptByName) assignedDoctorName = apptByName.doctor?.fullName || 'Неизвестный врач';
            }
            
            if (!assignedDoctorName) {
                // Try matching by closest time on the same day
                const sameDayAppts = currentMonthAppointments.filter(a => 
                    a.date.getDate() === sale.createdAt.getDate() &&
                    a.date.getMonth() === sale.createdAt.getMonth() &&
                    a.date.getFullYear() === sale.createdAt.getFullYear()
                );
                
                if (sameDayAppts.length > 0) {
                    const saleTime = sale.createdAt.getTime();
                    const closestAppt = sameDayAppts.reduce((prev, curr) => {
                        return Math.abs(curr.date.getTime() - saleTime) < Math.abs(prev.date.getTime() - saleTime) ? curr : prev;
                    });
                    
                    // Only match if within 12 hours
                    if (Math.abs(closestAppt.date.getTime() - saleTime) < 12 * 60 * 60 * 1000) {
                        assignedDoctorName = closestAppt.doctor?.fullName || 'Неизвестный врач';
                    }
                }
            }
            
            // Fallbacks
            if (!assignedDoctorName) {
                assignedDoctorName = sale.patient?.doctor?.fullName || sale.performedByName || 'Без врача (прямая продажа)';
            }

            // Force assign "подбор" to Aigerim
            if (sale.items && Array.isArray(sale.items)) {
                if (sale.items.some((item: any) => typeof item.name === 'string' && item.name.toLowerCase().includes('подбор'))) {
                    assignedDoctorName = 'Шораева Айгерим Аскаровна';
                }
            }

            // If the assigned doctor is not in the actual doctors list, we don't track them in doctor analytics
            const isActualDoctor = allDoctors.some(doc => (doc.fullName || 'Без имени') === assignedDoctorName);
            if (!isActualDoctor) {
                return; // Skip this sale for doctor analytics
            }

            if (!docStats[assignedDoctorName]) docStats[assignedDoctorName] = { count: 0, revenue: 0, appointmentsCount: 0, salesCount: 0 };
            docStats[assignedDoctorName].salesCount += 1;
            docStats[assignedDoctorName].count += 1; // legacy field
            docStats[assignedDoctorName].revenue += sale.total;

            sale.items.forEach(item => {
                const name = item.name;
                if (!srvStats[name]) srvStats[name] = { count: 0, revenue: 0 };
                srvStats[name].count += item.quantity;
                srvStats[name].revenue += item.total;
            });
        });

        const doctorsAnalytics = Object.entries(docStats)
            .map(([name, data]) => {
                const conversion = data.appointmentsCount > 0 
                    ? Math.round((data.salesCount / data.appointmentsCount) * 100) 
                    : 0;
                return { 
                    name, 
                    ...data,
                    conversion
                };
            })
            .sort((a, b) => b.revenue - a.revenue);
            
        const servicesAnalytics = Object.entries(srvStats)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

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
            })),
            servicesAnalytics,
            doctorsAnalytics
        });
    } catch (err: any) {
        console.error('Failed to calculate analytics:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
