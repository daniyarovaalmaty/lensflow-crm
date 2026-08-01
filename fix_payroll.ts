import fs from 'fs';

const filePath = './src/app/api/optic/finances/payroll/route.ts';
let code = fs.readFileSync(filePath, 'utf-8');

// We want to replace the logic inside the try { ... } block of GET

// 1. We will replace the entire logic for 'Fetch sales and attribute them to doctors' and 'staff.map'.
// Instead of risky regex, let's find the start and end tokens.

const startToken = "// 4. Fetch sales and attribute them to doctors";
const endToken = "// Timesheet / Calendar Deductions";

const startIndex = code.indexOf(startToken);
const endIndex = code.indexOf(endToken);

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find tokens');
    process.exit(1);
}

const newLogic = `// 4. Fetch sales and attribute them to doctors
        const periodSales = await prisma.sale.findMany({
            where: {
                organizationId: user.organizationId,
                createdAt: dateFilter
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
                    let totalCost = 0;
                    let transactionName = 'Транзакция';
                    let isPrimary = false, isSecondary = false, isConsultation = false;
                    let isFitting = false, isDiag = false, isStell = false, isGross = false, isArmost = false, isTiedra = false;

                    sale.items.forEach((item: any) => {
                        const name = typeof item.name === 'string' ? item.name.toLowerCase() : '';
                        const cat = item.category || '';
                        
                        if (item.product?.purchasePrice) {
                            totalCost += (item.product.purchasePrice * item.quantity);
                        }

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
                    if (transactionName.length > 40) transactionName = transactionName.substring(0, 40) + '...';

                    // Update metrics
                    if (isConsultation || isPrimary || isSecondary) consultationsMap.set(assignedDoctorId, (consultationsMap.get(assignedDoctorId) || 0) + 1);
                    if (isPrimary) primaryMap.set(assignedDoctorId, (primaryMap.get(assignedDoctorId) || 0) + 1);
                    if (isSecondary) secondaryMap.set(assignedDoctorId, (secondaryMap.get(assignedDoctorId) || 0) + 1);
                    
                    if (isFitting) fittingsMap.set(assignedDoctorId, (fittingsMap.get(assignedDoctorId) || 0) + 1);
                    if (isDiag) diagnosticsMap.set(assignedDoctorId, (diagnosticsMap.get(assignedDoctorId) || 0) + 1);
                    if (isStell) stellestMap.set(assignedDoctorId, (stellestMap.get(assignedDoctorId) || 0) + 1);
                    if (isGross) grossMap.set(assignedDoctorId, (grossMap.get(assignedDoctorId) || 0) + 1);
                    if (isArmost) armostMap.set(assignedDoctorId, (armostMap.get(assignedDoctorId) || 0) + 1);
                    if (isTiedra) tiedraMap.set(assignedDoctorId, (tiedraMap.get(assignedDoctorId) || 0) + 1);

                    // Calculation
                    let isInstallment = false;
                    if (sale.paymentMethod === 'installment12' || 
                        (sale.invoiceData as any)?.split?.some((sp: any) => sp.method === 'installment12' || sp.method === 'installment') || 
                        (sale.invoiceData as any)?.splitPayment?.installment12) {
                        isInstallment = true;
                    }

                    const bankFee = isInstallment ? Math.round(sale.total * 0.15) : 0;
                    const netIncome = Math.max(0, sale.total - totalCost - bankFee);

                    const arr = transactionsMap.get(assignedDoctorId) || [];
                    arr.push({ 
                        ...sale, 
                        transactionName, 
                        transactionAmount: sale.total, // Keep for backward compat
                        totalCost,
                        bankFee,
                        netIncome,
                        isInstallment 
                    });
                    transactionsMap.set(assignedDoctorId, arr);
                }
            }
        });

        const results = staff.map(st => {
            const rule = st.payrollRules[0] || { baseSalary: 0, salesPercent: 0 };
            const doctorPercent = rule.salesPercent > 0 ? (rule.salesPercent / 100) : 0.30; // fallback to 30%

            const doctorTransactions = transactionsMap.get(st.id) || [];
            
            let totalBonus = 0;

            const transactions = doctorTransactions.map((s: any) => {
                const bonus = Math.round(s.netIncome * doctorPercent);
                totalBonus += bonus;

                return {
                    id: s.id,
                    date: s.createdAt,
                    patientName: s.customerName || s.patient?.fullName || 'Неизвестный',
                    itemName: s.transactionName,
                    saleAmount: s.total,
                    netIncome: s.netIncome,
                    bonus: bonus,
                    isInstallment: s.isInstallment,
                    totalCost: s.totalCost,
                    bankFee: s.bankFee
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
            
            let salesBonus = isDoctor ? totalBonus : 0;
            let baseSal = rule.baseSalary;

            `;

code = code.substring(0, startIndex) + newLogic + code.substring(endIndex);

// We should also remove the previous logic that populated consultationsMap from periodAppointments.
// The old logic was:
/*
            if (isConsultation) consultationsMap.set(docId, (consultationsMap.get(docId) || 0) + 1);

            if (isPrimary) primaryMap.set(docId, (primaryMap.get(docId) || 0) + 1);
            else if (isRepeat) secondaryMap.set(docId, (secondaryMap.get(docId) || 0) + 1);
*/
code = code.replace(/if \(isConsultation\) consultationsMap\.set[\s\S]*?else if \(isRepeat\) secondaryMap\.set[^\n]*\n/, '');


fs.writeFileSync(filePath, code);
console.log('Successfully updated route.ts');
