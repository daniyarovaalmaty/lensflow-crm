import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const orgId = user.organizationId;

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30days'; // 'today' | '7days' | '30days' | 'all'

    // Calculate startDate based on period
    let startDate = new Date();
    let useDateFilter = true;

    if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
    } else if (period === '7days') {
        startDate.setDate(startDate.getDate() - 7);
    } else if (period === '30days') {
        startDate.setDate(startDate.getDate() - 30);
    } else {
        useDateFilter = false;
    }

    const dateFilter = useDateFilter ? { createdAt: { gte: startDate } } : {};

    // 1. Fetch Sales in period
    const sales = await prisma.sale.findMany({
        where: {
            organizationId: orgId,
            ...dateFilter,
        },
        include: {
            items: true,
        },
    });

    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalSales = sales.length;
    const avgCheck = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;

    // 2. Fetch unique patients and calculate LTV
    const patientSales = await prisma.sale.groupBy({
        by: ['patientId'],
        where: {
            organizationId: orgId,
            patientId: { not: null },
        },
        _sum: {
            total: true,
        },
    });

    const uniquePatientsCount = patientSales.length;
    const ltv = uniquePatientsCount > 0 
        ? Math.round(patientSales.reduce((sum, p) => sum + (p._sum.total || 0), 0) / uniquePatientsCount) 
        : 0;

    // 3. New patients count in period
    const newPatientsCount = await prisma.patient.count({
        where: {
            organizationId: orgId,
            ...dateFilter,
        },
    });

    // 4. CRM Leads conversion funnel
    const totalLeads = await prisma.lead.count({
        where: { clinicId: orgId, ...dateFilter }
    });
    const convertedLeads = await prisma.lead.count({
        where: { clinicId: orgId, stage: 'converted', ...dateFilter },
    });
    const leadConversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

    // Detailed CRM Pipeline stages
    const leadStages = await prisma.lead.groupBy({
        by: ['stage'],
        where: { clinicId: orgId, ...dateFilter },
        _count: { _all: true },
    });
    const crmFunnel = leadStages.reduce((acc: any, item) => {
        acc[item.stage] = item._count._all;
        return acc;
    }, {});

    // 5. Marketing Spend & ROMI
    const adSpends = await prisma.adSpend.findMany({
        where: { campaign: { clinicId: orgId }, ...(useDateFilter ? { spendDate: { gte: startDate } } : {}) },
    });
    const totalMarketingSpend = adSpends.reduce((sum, item) => sum + item.amount, 0);

    const leadsWithRevenue = await prisma.lead.findMany({
        where: {
            clinicId: orgId,
            revenue: { not: null },
            ...dateFilter,
        },
        select: {
            revenue: true,
        },
    });
    const attributedLeadRevenue = leadsWithRevenue.reduce((sum, item) => sum + (item.revenue || 0), 0);

    const romi = totalMarketingSpend > 0 
        ? Math.round(((attributedLeadRevenue - totalMarketingSpend) / totalMarketingSpend) * 100)
        : 0;

    // 6. Category breakdown
    const categoryTotals: Record<string, { value: number, quantity: number }> = {};
    const itemTotals: Record<string, { value: number, quantity: number, category: string, salesHistory: any[] }> = {};

    sales.forEach(sale => {
        sale.items.forEach(item => {
            const cat = item.category || 'Другое';
            if (!categoryTotals[cat]) categoryTotals[cat] = { value: 0, quantity: 0 };
            categoryTotals[cat].value += item.total;
            categoryTotals[cat].quantity += item.quantity;

            const name = item.name;
            if (!itemTotals[name]) itemTotals[name] = { value: 0, quantity: 0, category: cat, salesHistory: [] };
            itemTotals[name].value += item.total;
            itemTotals[name].quantity += item.quantity;
            itemTotals[name].salesHistory.push({
                saleId: sale.id,
                saleNumber: sale.saleNumber,
                date: sale.createdAt,
                customerName: sale.customerName,
                customerPhone: sale.customerPhone,
                paymentMethod: sale.paymentMethod,
                quantity: item.quantity,
                total: item.total
            });
        });
    });

    const categoriesBreakdown = Object.entries(categoryTotals)
        .map(([name, data]) => ({
            name,
            value: data.value,
            quantity: data.quantity,
        }))
        .sort((a, b) => b.value - a.value);

    const topSellingItems = Object.entries(itemTotals)
        .map(([name, data]) => ({
            name,
            ...data
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 15);

    // 7. Top 10 Patients by revenue
    const topPatientsGroup = await prisma.sale.groupBy({
        by: ['patientId'],
        where: {
            organizationId: orgId,
            patientId: { not: null },
        },
        _sum: {
            total: true,
        },
        _count: {
            id: true,
        },
        orderBy: {
            _sum: {
                total: 'desc',
            },
        },
        take: 10,
    });

    const top10Patients = await Promise.all(
        topPatientsGroup.map(async (g) => {
            const patient = await prisma.patient.findUnique({
                where: { id: g.patientId! },
                select: { name: true, phone: true, createdAt: true },
            });
            return {
                id: g.patientId,
                name: patient?.name || 'Неизвестный клиент',
                phone: patient?.phone || '—',
                totalSpent: g._sum.total || 0,
                ordersCount: g._count.id,
                joinedDate: patient?.createdAt,
            };
        })
    );

    // 8. Sales Dynamics (last 7 / 30 days)
    const dynamicsMap: Record<string, { date: string; revenue: number; count: number }> = {};
    
    const daysToGenerate = period === '7days' ? 7 : 30;
    for (let i = daysToGenerate - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        dynamicsMap[key] = { date: key, revenue: 0, count: 0 };
    }

    sales.forEach(sale => {
        const key = new Date(sale.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        if (dynamicsMap[key]) {
            dynamicsMap[key].revenue += sale.total;
            dynamicsMap[key].count += 1;
        }
    });

    const dynamics = Object.values(dynamicsMap);

    // 9. Products Summary (Hard lenses, frames, soft lenses, etc.)
    const productsSummary = {
        hardLenses: 0,
        sunGlasses: 0,
        frames: 0,
        consultations: 0,
        softLenses: 0,
        solutions: 0
    };

    sales.forEach(sale => {
        sale.items.forEach(item => {
            const cat = item.category || '';
            const nameLower = item.name.toLowerCase();

            // Hard lenses
            if (nameLower.includes('подбор') || nameLower.includes('ортокератолог') || nameLower.includes('ночных линз')) {
                if (nameLower.includes('одной')) {
                    productsSummary.hardLenses += 1 * item.quantity;
                } else if (nameLower.includes('подбор')) {
                    productsSummary.hardLenses += 2 * item.quantity;
                } else {
                    productsSummary.hardLenses += 1 * item.quantity;
                }
            }
            
            // Frames (sun & regular)
            if (cat === 'sun_glasses' || nameLower.includes('солнцезащит')) {
                productsSummary.sunGlasses += item.quantity;
            } else if (cat === 'frame' || nameLower.includes('оправа')) {
                productsSummary.frames += item.quantity;
            }

            // Consultations
            if (nameLower.includes('консультация') || nameLower.includes('диагностика')) {
                productsSummary.consultations += item.quantity;
            }

            // Soft lenses
            if (cat === 'contact_lens' || cat === 'spectacle_lens' || nameLower.includes('мкл') || nameLower.includes('мягк')) {
                productsSummary.softLenses += item.quantity;
            }

            // Solutions
            if (cat === 'solution' || nameLower.includes('раствор') || nameLower.includes('one step') || nameLower.includes('avisor')) {
                productsSummary.solutions += item.quantity;
            }
        });
    });

    return NextResponse.json({
        kpi: {
            totalRevenue,
            totalSales,
            avgCheck,
            ltv,
            newPatientsCount,
            leadConversionRate,
            romi,
            totalMarketingSpend,
            attributedLeadRevenue,
        },
        crmFunnel,
        categoriesBreakdown,
        topSellingItems,
        top10Patients,
        dynamics,
        productsSummary,
    });
}
