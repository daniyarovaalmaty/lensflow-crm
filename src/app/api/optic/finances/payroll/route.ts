import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    try {
        const url = new URL(req.url);
        const start = url.searchParams.get('start');
        const end = url.searchParams.get('end');

        let dateFilter = {};
        if (start && end) {
            dateFilter = {
                gte: new Date(start),
                lte: new Date(end)
            };
        } else {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            dateFilter = { gte: firstDay, lte: lastDay };
        }

        // 1. Get all users in the organization with their roles and payroll rules
        const staff = await prisma.user.findMany({
            where: { organizationId: user.organizationId },
            include: { payrollRules: true }
        });

        // 2. Calculate sales for cashiers (non-doctors) using CashTransaction
        const salesTxs = await prisma.cashTransaction.groupBy({
            by: ['createdById'],
            where: {
                cashRegister: { organizationId: user.organizationId },
                category: 'sale',
                createdAt: dateFilter
            },
            _sum: {
                amount: true
            }
        });

        const cashierSalesMap = new Map();
        salesTxs.forEach(tx => {
            cashierSalesMap.set(tx.createdById, tx._sum.amount || 0);
        });

        // 3. Fetch appointments and calculate metrics for doctors
        const periodAppointments = await prisma.appointment.findMany({
            where: {
                clinicId: user.organizationId,
                date: dateFilter
            },
            include: { doctor: true }
        });

        const consultationsMap = new Map();
        const fittingsMap = new Map();
        const primaryMap = new Map();
        const secondaryMap = new Map();

        periodAppointments.forEach(appt => {
            if (!appt.doctorId) return;
            const docId = appt.doctorId;
            
            const isFitting = appt.type.includes('fitting') || appt.type === 'ok_delivery';
            const isConsultation = appt.type.includes('consultation');
            const isPrimary = appt.type.includes('primary');
            const isRepeat = appt.type.includes('repeat');

            if (isFitting) fittingsMap.set(docId, (fittingsMap.get(docId) || 0) + 1);
            else if (isConsultation) consultationsMap.set(docId, (consultationsMap.get(docId) || 0) + 1);

            if (isPrimary) primaryMap.set(docId, (primaryMap.get(docId) || 0) + 1);
            else if (isRepeat) secondaryMap.set(docId, (secondaryMap.get(docId) || 0) + 1);
        });

        // 4. Fetch sales and attribute them to doctors
        const periodSales = await prisma.sale.findMany({
            where: {
                organizationId: user.organizationId,
                createdAt: dateFilter
            },
            include: {
                items: true,
                patient: { include: { doctor: true } }
            }
        });

        const doctorSalesMap = new Map();

        periodSales.forEach(sale => {
            let assignedDoctorId = null;

            if (sale.patientId) {
                const appt = periodAppointments.find(a => a.patientId === sale.patientId);
                if (appt) assignedDoctorId = appt.doctorId;
            }

            if (!assignedDoctorId) {
                const apptByName = periodAppointments.find(a => {
                    if (!a.patientName || !sale.customerName) return false;
                    const aName = a.patientName.toLowerCase().trim();
                    const sName = sale.customerName.toLowerCase().trim();
                    const aParts = aName.split(' ').filter(p => p.length >= 3);
                    const sParts = sName.split(' ').filter(p => p.length >= 3);
                    if (aParts.length > 0 && sParts.length > 0) {
                        return aParts.some(ap => sParts.some(sp => ap.includes(sp) || sp.includes(ap)));
                    }
                    return aName.includes(sName) || sName.includes(aName);
                });
                if (apptByName) assignedDoctorId = apptByName.doctorId;
            }

            if (!assignedDoctorId) {
                const sameDayAppts = periodAppointments.filter(a => 
                    a.date.getDate() === sale.createdAt.getDate() &&
                    a.date.getMonth() === sale.createdAt.getMonth() &&
                    a.date.getFullYear() === sale.createdAt.getFullYear()
                );
                if (sameDayAppts.length > 0) {
                    const saleTime = sale.createdAt.getTime();
                    const closestAppt = sameDayAppts.reduce((prev, curr) => {
                        return Math.abs(curr.date.getTime() - saleTime) < Math.abs(prev.date.getTime() - saleTime) ? curr : prev;
                    });
                    if (Math.abs(closestAppt.date.getTime() - saleTime) < 12 * 60 * 60 * 1000) {
                        assignedDoctorId = closestAppt.doctorId;
                    }
                }
            }

            if (!assignedDoctorId && sale.patient?.doctor?.id) {
                assignedDoctorId = sale.patient.doctor.id;
            }

            if (sale.items && Array.isArray(sale.items)) {
                if (sale.items.some((item: any) => typeof item.name === 'string' && item.name.toLowerCase().includes('подбор'))) {
                    const aigerim = staff.find(s => s.fullName?.includes('Айгерим'));
                    if (aigerim) assignedDoctorId = aigerim.id;
                }
            }

            if (assignedDoctorId) {
                doctorSalesMap.set(assignedDoctorId, (doctorSalesMap.get(assignedDoctorId) || 0) + sale.total);
            }
        });

        const results = staff.map(st => {
            const rule = st.payrollRules[0] || { baseSalary: 0, salesPercent: 0 };
            
            const docMetrics = {
                consultations: consultationsMap.get(st.id) || 0,
                fittings: fittingsMap.get(st.id) || 0,
                primary: primaryMap.get(st.id) || 0,
                secondary: secondaryMap.get(st.id) || 0
            };

            const isValeria = st.fullName?.includes('Валерия');
            const isDoctor = st.role === 'doctor' || 
                             docMetrics.consultations > 0 || 
                             docMetrics.fittings > 0 ||
                             st.fullName?.includes('Айгерим') ||
                             st.fullName?.includes('Замира');
            
            let salesTotal = 0;
            if (isDoctor) {
                salesTotal = doctorSalesMap.get(st.id) || 0;
            } else {
                salesTotal = cashierSalesMap.get(st.id) || 0;
            }

            let salesBonus = Math.round(salesTotal * (rule.salesPercent / 100));
            let baseSal = rule.baseSalary;
            
            if (isValeria) {
                if (baseSal === 0) baseSal = 200000;
                
                // Currently using docMetrics.fittings from her calendar appointments
                const countForBonus = docMetrics.fittings;
                
                // Bonus: 0 for the first 10, then 10,000 for each subsequent fitting
                const extraBonus = Math.max(0, countForBonus - 10) * 10000;
                salesBonus += extraBonus;
            }
            
            const totalEstimated = baseSal + salesBonus;

            return {
                user: { id: st.id, fullName: st.fullName, email: st.email, role: st.role, subRole: st.subRole, isDoctor: isDoctor || isValeria },
                rule: { baseSalary: baseSal, salesPercent: rule.salesPercent },
                periodSalesTotal: salesTotal,
                estimatedSalesBonus: salesBonus,
                totalEstimated: totalEstimated,
                metrics: docMetrics
            };
        });

        return NextResponse.json({
            period: dateFilter,
            staffPayroll: results
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user?.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    try {
        const body = await req.json();
        const { action, targetUserId, baseSalary, salesPercent, periodStart, periodEnd, baseAmount, salesAmount } = body;

        if (action === 'update_rule') {
            const rule = await prisma.payrollRule.upsert({
                where: {
                    organizationId_userId: {
                        organizationId: user.organizationId,
                        userId: targetUserId
                    }
                },
                update: {
                    baseSalary: parseInt(baseSalary, 10),
                    salesPercent: parseFloat(salesPercent)
                },
                create: {
                    organizationId: user.organizationId,
                    userId: targetUserId,
                    baseSalary: parseInt(baseSalary, 10),
                    salesPercent: parseFloat(salesPercent)
                }
            });
            return NextResponse.json(rule);
        }

        if (action === 'generate_payout') {
            const totalAmount = parseInt(baseAmount, 10) + parseInt(salesAmount, 10);
            const payout = await prisma.payrollPayout.create({
                data: {
                    organizationId: user.organizationId,
                    userId: targetUserId,
                    periodStart: new Date(periodStart),
                    periodEnd: new Date(periodEnd),
                    baseAmount: parseInt(baseAmount, 10),
                    salesAmount: parseInt(salesAmount, 10),
                    totalAmount,
                    status: 'calculated'
                }
            });
            return NextResponse.json(payout);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
