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

        // 1. Get all users in the organization with their roles, payroll rules, schedules, and attendance
        const staff = await prisma.user.findMany({
            where: { organizationId: user.organizationId },
            include: { 
                payrollRules: true,
                workSchedules: true,
                attendanceRecords: {
                    where: { date: dateFilter }
                }
            }
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
        const diagnosticsMap = new Map();
        const stellestMap = new Map();
        const grossMap = new Map();
        const armostMap = new Map();
        const tiedraMap = new Map();
        const transactionsMap = new Map();
        const primaryMap = new Map();
        const secondaryMap = new Map();

        periodAppointments.forEach(appt => {
            if (!appt.doctorId) return;
            const docId = appt.doctorId;
            
            const isFitting = appt.type.includes('fitting') || appt.type === 'ok_delivery';
            const isConsultation = appt.type.includes('consultation');
            const isPrimary = appt.type.includes('primary');
            const isRepeat = appt.type.includes('repeat');

            if (isConsultation) consultationsMap.set(docId, (consultationsMap.get(docId) || 0) + 1);

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
        const doctorConsultationSalesMap = new Map();

        periodSales.forEach(sale => {
            let assignedDoctorId = sale.doctorId || null;

            if (!assignedDoctorId && sale.patientId) {
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
                if (sale.items.some((item: any) => typeof item.name === 'string' && item.name.toLowerCase().includes('подбор') && item.name.toLowerCase().includes('ночн'))) {
                    const aigerim = staff.find(s => s.fullName?.includes('Айгерим'));
                    if (aigerim) assignedDoctorId = aigerim.id;
                }
            }

            (sale as any)._assignedDoctorId = assignedDoctorId;

            if (assignedDoctorId) {
                doctorSalesMap.set(assignedDoctorId, (doctorSalesMap.get(assignedDoctorId) || 0) + sale.total);
                
                if (sale.items && Array.isArray(sale.items)) {
                    const consultationItems = sale.items.filter((item: any) => 
                        typeof item.name === 'string' && item.name.toLowerCase().includes('консультация')
                    );
                    const consultationTotal = consultationItems.reduce((sum, item: any) => sum + (item.total || 0), 0);
                    if (consultationTotal > 0) {
                        doctorConsultationSalesMap.set(assignedDoctorId, (doctorConsultationSalesMap.get(assignedDoctorId) || 0) + consultationTotal);
                    }

                    let isFitting = false, isDiag = false, isStell = false, isGross = false, isArmost = false, isTiedra = false;
                    let transactionName = 'Транзакция';
                    let transactionAmount = 0;
                    
                    sale.items.forEach((item: any) => {
                        const name = typeof item.name === 'string' ? item.name.toLowerCase() : '';
                        const cat = item.category || '';
                        
                        let matched = false;
                        if (name.includes('подбор') || cat === 'service_fitting') {
                            const aigerim = staff.find(s => s.fullName?.includes('Айгерим'));
                            if (aigerim && assignedDoctorId === aigerim.id) {
                                if (name.includes('ночн')) { isFitting = true; matched = true; }
                            } else {
                                isFitting = true; matched = true;
                            }
                        }
                        if (name.includes('диагностика')) { isDiag = true; matched = true; }
                        if (name.includes('stellest') || name.includes('стеллест')) { isStell = true; matched = true; }
                        if (name.includes('gross')) { isGross = true; matched = true; }
                        if (name.includes('armost')) { isArmost = true; matched = true; }
                        if (name.includes('tiedra')) { isTiedra = true; matched = true; }

                        if (matched && typeof item.name === 'string') {
                            transactionName = item.name;
                            transactionAmount += (item.total || 0);
                        }
                    });

                    if (isFitting || isDiag || isStell || isGross || isArmost || isTiedra) {
                        if (isFitting) fittingsMap.set(assignedDoctorId, (fittingsMap.get(assignedDoctorId) || 0) + 1);
                        if (isDiag) diagnosticsMap.set(assignedDoctorId, (diagnosticsMap.get(assignedDoctorId) || 0) + 1);
                        if (isStell) stellestMap.set(assignedDoctorId, (stellestMap.get(assignedDoctorId) || 0) + 1);
                        if (isGross) grossMap.set(assignedDoctorId, (grossMap.get(assignedDoctorId) || 0) + 1);
                        if (isArmost) armostMap.set(assignedDoctorId, (armostMap.get(assignedDoctorId) || 0) + 1);
                        if (isTiedra) tiedraMap.set(assignedDoctorId, (tiedraMap.get(assignedDoctorId) || 0) + 1);
                    }

                    if (transactionName === 'Транзакция' && sale.items.length > 0) {
                        transactionName = sale.items[0].name || 'Транзакция';
                    }

                    const arr = transactionsMap.get(assignedDoctorId) || [];
                    arr.push({ ...sale, transactionName, transactionAmount });
                    transactionsMap.set(assignedDoctorId, arr);
                }
            }
        });

        const results = staff.map(st => {
            const rule = st.payrollRules[0] || { baseSalary: 0, salesPercent: 0 };
            
            // Build transactions for the UI from sales
            const doctorTransactions = transactionsMap.get(st.id) || [];
            const transactions = doctorTransactions.map((s: any) => {
                let isInstallment = false;
                if (s.paymentMethod === 'installment12' || 
                    (s.invoiceData as any)?.split?.some((sp: any) => sp.method === 'installment12') || 
                    (s.invoiceData as any)?.splitPayment?.installment12) {
                    isInstallment = true;
                }

                let saleAmount = s.transactionAmount > 0 ? s.transactionAmount : s.total;

                return {
                    id: s.id,
                    date: s.createdAt,
                    patientName: s.customerName || s.patient?.fullName || 'Неизвестный',
                    itemName: s.transactionName,
                    saleAmount: saleAmount,
                    isInstallment
                };
            });

            const docMetrics = {
                consultations: consultationsMap.get(st.id) || 0,
                fittings: fittingsMap.get(st.id) || 0,
                diagnostics: diagnosticsMap.get(st.id) || 0,
                stellest: stellestMap.get(st.id) || 0,
                gross: grossMap.get(st.id) || 0,
                armost: armostMap.get(st.id) || 0,
                tiedra: tiedraMap.get(st.id) || 0,
                primary: primaryMap.get(st.id) || 0,
                secondary: secondaryMap.get(st.id) || 0,
                transactions
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
            
            const isAigerim = st.fullName?.includes('Айгерим');
            if (isAigerim) {
                let aigerimSalesBonus = 0;
                let consultBonus = 0;

                periodSales.forEach(sale => {
                    if ((sale as any)._assignedDoctorId !== st.id) return;
                    if (!sale.items || !Array.isArray(sale.items)) return;

                    sale.items.forEach((item: any) => {
                        const isNightLens = typeof item.name === 'string' && item.name.toLowerCase().includes('подбор') && item.name.toLowerCase().includes('ночн') && !item.name.toLowerCase().includes('консультация');
                        if (isNightLens) {
                            let itemTotal = Number(item.total || 0);
                            let saleTotalNum = Number(sale.total || 0);
                            let fittingAmount = Math.min(itemTotal, saleTotalNum);
                            let itemPrice = Number(item.unitPrice || 0);
                            let quantity = Number(item.quantity || 1);

                            let isHalf = false;
                            if (fittingAmount <= (itemPrice * 0.6) || item.name.toLowerCase().includes('1 глаз') || item.name.toLowerCase().includes('один глаз')) {
                                isHalf = true;
                            }

                            let lensCost = (isHalf ? 25000 : 50000) * quantity;

                            let isInstallment = false;
                            if (sale.paymentMethod === 'installment12' || sale.paymentMethod === 'installment') isInstallment = true;
                            const invoiceData = sale.invoiceData as any;
                            if (invoiceData?.splitPayment?.installment12 || invoiceData?.splitPayment?.installment) isInstallment = true;
                            if (invoiceData?.split?.some((sp: any) => sp.method === 'installment12' || sp.method === 'installment')) isInstallment = true;

                            let installmentDeduction = isInstallment ? fittingAmount * 0.15 : 0;

                            let baseAmount = fittingAmount - lensCost - installmentDeduction;
                            if (baseAmount < 0) baseAmount = 0;

                            aigerimSalesBonus += baseAmount * 0.30;
                        }
                    });
                });

                const aigerimPrimaryAppts = periodAppointments.filter(a => a.doctorId === st.id && a.type.includes('primary'));
                
                aigerimPrimaryAppts.forEach(appt => {
                    let apptName = (appt.patientName || '').toLowerCase().trim();
                    let match = periodSales.find(s => {
                        const hasConsultationItem = s.items?.some((i: any) => typeof i.name === 'string' && i.name.toLowerCase().includes('консультация'));
                        if (!hasConsultationItem) return false;
                        
                        let saleName = (s.customerName || (s as any).patient?.fullName || '').toLowerCase().trim();
                        if (!saleName) return false;
                        const aParts = apptName.split(' ').filter((p: string) => p.length >= 3);
                        const sParts = saleName.split(' ').filter((p: string) => p.length >= 3);
                        if (aParts.length > 0 && sParts.length > 0) {
                            return aParts.some((ap: string) => sParts.some((sp: string) => ap.includes(sp) || sp.includes(ap)));
                        }
                        return apptName.includes(saleName) || saleName.includes(apptName);
                    });
                    
                    if (match) {
                        const consultItem = match.items.find((i: any) => typeof i.name === 'string' && i.name.toLowerCase().includes('консультация'));
                        if (consultItem) {
                            consultBonus += Number(consultItem.total || 0) * 0.30;
                        }
                    }
                });

                salesBonus = Math.round(aigerimSalesBonus + consultBonus);
            }
            
            const isZamira = st.fullName?.includes('Замира');
            if (isZamira) {
                const consultationSales = doctorConsultationSalesMap.get(st.id) || 0;
                // Zamira gets 50% from consultation sales. We subtract rule.salesPercent to avoid double-counting
                const extraConsultationBonus = Math.max(0, Math.round(consultationSales * 0.50 - consultationSales * (rule.salesPercent / 100)));
                salesBonus += extraConsultationBonus;
            }
            
            if (isValeria) {
                if (baseSal === 0) baseSal = 200000;
                
                // Valeria is a salesperson, so we count fittings from the sales she processed at the POS
                let posFittingsCount = 0;
                periodSales.forEach(sale => {
                    if (sale.performedById === st.id) {
                        const hasFitting = sale.items?.some((item: any) => 
                            (typeof item.name === 'string' && item.name.toLowerCase().includes('подбор')) || 
                            item.category === 'service_fitting'
                        );
                        if (hasFitting) {
                            posFittingsCount++;
                        }
                    }
                });

                // Total fittings for her bonus is her calendar fittings + POS fittings
                const countForBonus = docMetrics.fittings + posFittingsCount;
                
                // Override the display metrics so it shows up in the table
                docMetrics.fittings = countForBonus;
                
                // Bonus: 0 for the first 10, then 10,000 for each subsequent fitting
                const extraBonus = Math.max(0, countForBonus - 10) * 10000;
                salesBonus += extraBonus;
            }
            
            // Timesheet / Calendar Deductions
            const schedule = st.workSchedules && st.workSchedules.length > 0 ? st.workSchedules[0] : null;
            let expectedDays = schedule ? schedule.expectedDays : 22; // Default to ~22 working days
            let dailyRate = baseSal > 0 ? Math.round(baseSal / expectedDays) : 0;
            let missedDays = st.attendanceRecords ? st.attendanceRecords.filter((r: any) => r.status === 'ABSENT').length : 0;
            let timesheetDeduction = missedDays * dailyRate;
            let finalBaseSal = Math.max(0, baseSal - timesheetDeduction);

            const totalEstimated = finalBaseSal + salesBonus;

            return {
                user: { id: st.id, fullName: st.fullName, email: st.email, role: st.role, subRole: st.subRole, isDoctor: isDoctor || isValeria },
                rule: { baseSalary: baseSal, salesPercent: rule.salesPercent },
                timesheet: { 
                    expectedDays, 
                    dailyRate, 
                    missedDays, 
                    deduction: timesheetDeduction, 
                    finalBaseSal,
                    scheduleType: schedule?.scheduleType || 'custom',
                    attendance: st.attendanceRecords || []
                },
                periodSalesTotal: salesTotal,
                estimatedSalesBonus: salesBonus,
                totalEstimated: totalEstimated,
                metrics: docMetrics
            };
        });

        const isMy = url.searchParams.get('my') === 'true';

        return NextResponse.json({
            period: dateFilter,
            staffPayroll: isMy ? results.filter(r => r.user.id === user.id) : results
        });

    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

        if (action === 'update_schedule') {
            const { scheduleType, expectedDays } = body;
            const schedule = await prisma.workSchedule.upsert({
                where: {
                    organizationId_userId: {
                        organizationId: user.organizationId,
                        userId: targetUserId
                    }
                },
                update: {
                    scheduleType,
                    expectedDays: parseInt(expectedDays, 10)
                },
                create: {
                    organizationId: user.organizationId,
                    userId: targetUserId,
                    scheduleType,
                    expectedDays: parseInt(expectedDays, 10)
                }
            });
            return NextResponse.json(schedule);
        }

        if (action === 'toggle_attendance') {
            const { date, status } = body; // status: PRESENT, ABSENT, SICK, VACATION
            const dateObj = new Date(date);
            // reset time to midnight UTC for consistent matching
            dateObj.setUTCHours(0, 0, 0, 0);

            const record = await prisma.attendanceRecord.upsert({
                where: {
                    userId_date: {
                        userId: targetUserId,
                        date: dateObj
                    }
                },
                update: {
                    status
                },
                create: {
                    organizationId: user.organizationId,
                    userId: targetUserId,
                    date: dateObj,
                    status
                }
            });
            return NextResponse.json(record);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
