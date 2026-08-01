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

                    });

        // 4. Fetch sales and attribute them to doctors
        const periodSales = await prisma.sale.findMany({
            where: {
                organizationId: user.organizationId,
                createdAt: dateFilter,
                paymentStatus: { not: 'unpaid' }
            },
            include: {
                items: { include: { product: true } },
                patient: { include: { doctor: true } }
            }
        });

        const doctorSalesMap = new Map();

        periodSales.forEach(sale => {
            let assignedDoctorId = sale.doctorId || null;

            if (!assignedDoctorId && sale.patientId) {
                const appt = periodAppointments.find(a => a.patientId === sale.patientId);
                if (appt) assignedDoctorId = appt.doctorId;
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

            (sale as any)._assignedDoctorId = assignedDoctorId;

            if (assignedDoctorId) {
                doctorSalesMap.set(assignedDoctorId, (doctorSalesMap.get(assignedDoctorId) || 0) + sale.total);
            }
                
            if (sale.items && Array.isArray(sale.items)) {
                let totalCost = 0;
                let transactionName = 'Транзакция';
                let isPrimary = false, isSecondary = false, isConsultation = false;
                let isFitting = false, isDiag = false, isStell = false, isGross = false, isArmost = false, isTiedra = false;

                sale.items.forEach((item: any) => {
                    const name = typeof item.name === 'string' ? item.name.toLowerCase() : '';
                    const cat = item.category || item.product?.category || '';
                    const isService = item.product?.type === 'service' || cat.includes('service') || name.includes('консультация') || name.includes('подбор') || name.includes('диагностика');
                    
                    let itemCost = 0;
                    if (name.includes('ночн') || name.includes('ок-линз') || name.includes('ok-линз') || name.includes('ортокератолог')) {
                        let isToric = name.includes('торич') || name.includes('торик') || name.includes('toric') || name.includes('tor');
                        let isHalf = name.includes('1 глаз') || name.includes('один глаз') || name.includes('одна линза') || name.includes('1 линза') || name.includes('поломан');
                        
                        let dk = 100;
                        if (name.includes('180')) dk = 180;
                        else if (name.includes('125')) dk = 125;
                        else if (name.includes('100')) dk = 100;
                        else if (name.includes('50') || name.includes('dk 50') || name.includes('dk50')) dk = 50;
                        
                        let baseCost = 0;
                        if (isToric) {
                            if (dk === 180) baseCost = 36000 * 2;
                            else if (dk === 125) baseCost = 33000 * 2;
                            else if (dk === 100) baseCost = 30000 * 2;
                            else if (dk === 50) baseCost = 12000 * 2;
                            else baseCost = 60000;
                        } else {
                            if (dk === 180) baseCost = 31000 * 2;
                            else if (dk === 125) baseCost = 28000 * 2;
                            else if (dk === 100) baseCost = 25000 * 2;
                            else if (dk === 50) baseCost = 12000 * 2;
                            else baseCost = 50000;
                        }
                        
                        if (isHalf) baseCost /= 2;
                        itemCost = baseCost * (item.quantity || 1);
                    } else if (!isService && item.product?.purchasePrice) {
                        itemCost = item.product.purchasePrice * (item.quantity || 1);
                    }
                    
                    totalCost += itemCost;

                    if (name.includes('первичная')) isPrimary = true;
                    else if (name.includes('повторная')) isSecondary = true;
                    else if (name.includes('консультация')) isConsultation = true;
                    
                    if (name.includes('подбор') || cat === 'service_fitting') isFitting = true;
                    if (name.includes('диагностика')) isDiag = true;
                    if (name.includes('stellest') || name.includes('стеллест')) isStell = true;
                    if (name.includes('gross')) isGross = true;
                    if (name.includes('armost') || name.includes('артмост')) isArmost = true;
                    if (name.includes('tiedra') || name.includes('тиэдра')) isTiedra = true;
                });

                // Set transaction name to the first matched item, or concatenate
                transactionName = sale.items.map((i: any) => i.name).join(', ');

                // Update metrics
                if (assignedDoctorId) {
                    if (isConsultation || isPrimary || isSecondary) consultationsMap.set(assignedDoctorId, (consultationsMap.get(assignedDoctorId) || 0) + 1);
                    if (isPrimary) primaryMap.set(assignedDoctorId, (primaryMap.get(assignedDoctorId) || 0) + 1);
                    if (isSecondary) secondaryMap.set(assignedDoctorId, (secondaryMap.get(assignedDoctorId) || 0) + 1);
                    
                    if (isFitting) fittingsMap.set(assignedDoctorId, (fittingsMap.get(assignedDoctorId) || 0) + 1);
                    if (isDiag) diagnosticsMap.set(assignedDoctorId, (diagnosticsMap.get(assignedDoctorId) || 0) + 1);
                    if (isStell) stellestMap.set(assignedDoctorId, (stellestMap.get(assignedDoctorId) || 0) + 1);
                    if (isGross) grossMap.set(assignedDoctorId, (grossMap.get(assignedDoctorId) || 0) + 1);
                    if (isArmost) armostMap.set(assignedDoctorId, (armostMap.get(assignedDoctorId) || 0) + 1);
                    if (isTiedra) tiedraMap.set(assignedDoctorId, (tiedraMap.get(assignedDoctorId) || 0) + 1);
                }

                // Calculation
                let isInstallment = false;
                if (sale.paymentMethod === 'installment12' || 
                    (sale.invoiceData as any)?.split?.some((sp: any) => sp.method === 'installment12' || sp.method === 'installment') || 
                    (sale.invoiceData as any)?.splitPayment?.installment12) {
                    isInstallment = true;
                }

                const bankFee = isInstallment ? Math.round(sale.total * 0.15) : 0;
                const netIncome = Math.max(0, sale.total - totalCost - bankFee);

                const txObj = { 
                    ...sale, 
                    transactionName, 
                    transactionAmount: sale.total, // Keep for backward compat
                    totalCost,
                    bankFee,
                    netIncome,
                    isInstallment 
                };

                if (assignedDoctorId) {
                    const arr = transactionsMap.get(assignedDoctorId) || [];
                    arr.push(txObj);
                    transactionsMap.set(assignedDoctorId, arr);
                }

                if (sale.performedById && sale.performedById !== assignedDoctorId) {
                    const arr = transactionsMap.get(sale.performedById) || [];
                    arr.push(txObj);
                    transactionsMap.set(sale.performedById, arr);
                }
            }
        });

        const results = staff.map(st => {
            const rule = st.payrollRules[0] || { baseSalary: 0, salesPercent: 0 };
            const doctorPercent = rule.salesPercent > 0 ? (rule.salesPercent / 100) : 0.30; // fallback to 30%

            const doctorTransactions = transactionsMap.get(st.id) || [];
            
            let totalBonus = 0;

            const transactions = doctorTransactions.flatMap((s: any) => {
                return s.items.map((item: any) => {
                    const name = typeof item.name === 'string' ? item.name.toLowerCase() : '';
                    const cat = item.category || item.product?.category || '';
                    const isService = item.product?.type === 'service' || cat.includes('service') || name.includes('консультация') || name.includes('подбор') || name.includes('диагностика');
                    
                    let itemCost = 0;
                    if (name.includes('ночн') || name.includes('ок-линз') || name.includes('ok-линз') || name.includes('ортокератолог')) {
                        let isToric = name.includes('торич') || name.includes('торик') || name.includes('toric') || name.includes('tor');
                        let isHalf = name.includes('1 глаз') || name.includes('один глаз') || name.includes('одна линза') || name.includes('1 линза') || name.includes('поломан');
                        
                        let dk = 100;
                        if (name.includes('180')) dk = 180;
                        else if (name.includes('125')) dk = 125;
                        else if (name.includes('100')) dk = 100;
                        else if (name.includes('50') || name.includes('dk 50') || name.includes('dk50')) dk = 50;
                        
                        let baseCost = 0;
                        if (isToric) {
                            if (dk === 180) baseCost = 36000 * 2;
                            else if (dk === 125) baseCost = 33000 * 2;
                            else if (dk === 100) baseCost = 30000 * 2;
                            else if (dk === 50) baseCost = 12000 * 2;
                            else baseCost = 60000;
                        } else {
                            if (dk === 180) baseCost = 31000 * 2;
                            else if (dk === 125) baseCost = 28000 * 2;
                            else if (dk === 100) baseCost = 25000 * 2;
                            else if (dk === 50) baseCost = 12000 * 2;
                            else baseCost = 50000;
                        }
                        
                        if (isHalf) baseCost /= 2;
                        itemCost = baseCost * (item.quantity || 1);
                    } else if (!isService && item.product?.purchasePrice) {
                        itemCost = item.product.purchasePrice * (item.quantity || 1);
                    }

                    let effectiveDiscountRatio = (s.subtotal && s.subtotal > 0) ? Math.max(0, s.subtotal - s.total) / s.subtotal : 0;
                    let effectiveItemTotal = Math.round(item.total * (1 - effectiveDiscountRatio));

                    let itemBankFee = s.isInstallment ? Math.round(effectiveItemTotal * 0.15) : 0;
                    
                    let isStellestOrGross = name.includes('stellest') || name.includes('стеллест') || name.includes('gross') || name.includes('гросс');
                    
                    let isExcluded = cat === 'product_frames' || cat === 'product_sunglasses' || 
                                     name.includes('оправа') || name.includes('солнцезащит') || name.includes('очки') ||
                                     name.includes('раствор') || name.includes('капли') || name.includes('one step') || name.includes('пероксид') ||
                                     name.includes('avisor') || name.includes('unica') || name.includes('aosept') || name.includes('систейн') ||
                                     name.includes('контейнер') || name.includes('манипулятор') || name.includes('пинцет') || name.includes('аксессуар') ||
                                     name.includes('работа мастера') || name.includes('изготовление') || name.includes('вставка') || name.includes('ремонт') ||
                                     cat === 'product_accessories' || cat === 'product_solutions';
                    
                    let isCashierTarget = st.fullName?.includes('Татьяна') || st.fullName?.includes('Елена');
                    let cashierPercent = 0.08;

                    let saleBonus = 0;
                    let validNetIncome = 0;
                    
                    if (isCashierTarget) {
                        let isCashierExcluded = false;
                        if (name.includes('ночн') || name.includes('ок-линз') || name.includes('ok-линз') || name.includes('ортокератолог')) {
                            isCashierExcluded = true;
                        } else if (name.includes('artmost') || name.includes('артмост') || name.includes('tiedra') || name.includes('тиэдра')) {
                            isCashierExcluded = true;
                        } else if (isService || name.includes('диагностика') || name.includes('консультация') || name.includes('подбор') || name.includes('прием')) {
                            isCashierExcluded = true;
                        }
                        
                        if (isCashierExcluded) {
                            validNetIncome = 0;
                            saleBonus = 0;
                        } else {
                            let net = Math.max(0, effectiveItemTotal - itemCost - itemBankFee);
                            validNetIncome = net;
                            saleBonus = Math.round(net * cashierPercent);
                        }
                    } else {
                        if (isExcluded) {
                            validNetIncome = 0;
                            saleBonus = 0;
                        } else if (isStellestOrGross) {
                            saleBonus = Math.round(effectiveItemTotal * 0.04);
                            validNetIncome = effectiveItemTotal;
                        } else {
                            let net = Math.max(0, effectiveItemTotal - itemCost - itemBankFee);
                            validNetIncome = net;
                            saleBonus = Math.round(net * doctorPercent);
                        }
                    }

                    totalBonus += saleBonus;

                    return {
                        id: s.id,
                        date: s.createdAt,
                        patientName: s.customerName || s.patient?.fullName || 'Неизвестный',
                        itemName: item.name,
                        saleAmount: effectiveItemTotal,
                        netIncome: validNetIncome,
                        bonus: saleBonus,
                        isInstallment: s.isInstallment,
                        totalCost: itemCost,
                        bankFee: itemBankFee
                    };
                });
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
            
            const isCashierTarget = st.fullName?.includes('Татьяна') || st.fullName?.includes('Елена');
            
            let salesTotal = 0;
            if (isDoctor) {
                salesTotal = doctorSalesMap.get(st.id) || 0;
            } else {
                salesTotal = cashierSalesMap.get(st.id) || 0;
            }

            let salesBonus = (isDoctor || isCashierTarget) ? totalBonus : Math.round(salesTotal * (rule.salesPercent / 100));
            let baseSal = rule.baseSalary;

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
