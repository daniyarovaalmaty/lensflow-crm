require('dotenv').config();
const { Client } = require('pg');
const xlsx = require('xlsx');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();
    
    // Подборы ночных линз
    const res = await client.query(`
        SELECT s.id, s."createdAt", s."customerName", s.total, s."paymentMethod", s."invoiceData", si.name as item_name, si.total as item_total, si."unitPrice", si.quantity
        FROM sales s
        JOIN sale_items si ON s.id = si."saleId"
        WHERE s."doctorId" = 'cmm64iwmr0007jxu35ncgntbt'
          AND si.name ILIKE '%подбор%' AND si.name ILIKE '%ночн%'
          AND si.name NOT ILIKE '%консультация%'
          AND s."createdAt" >= '2026-06-01' AND s."createdAt" <= '2026-06-30 23:59:59'
        ORDER BY s."createdAt" ASC
    `);

    let totalBonus = 0;
    const fittingData = [];
    
    for (let row of res.rows) {
        let dateStr = row.createdAt.toISOString().split('T')[0];
        let itemTotal = Number(row.item_total);
        let saleTotal = Number(row.total);
        let fittingAmount = Math.min(itemTotal, saleTotal); // Берем фактически оплаченную сумму, если была скидка на весь чек
        let itemPrice = Number(row.unitPrice);
        
        let isHalf = false;
        if (fittingAmount <= (itemPrice * 0.6) || row.item_name.toLowerCase().includes('1 глаз') || row.item_name.toLowerCase().includes('один глаз')) {
            isHalf = true;
        }

        let lensCost = (isHalf ? 25000 : 50000) * row.quantity;
        
        let isInstallment = false;
        let invoiceData = row.invoiceData;
        if (row.paymentMethod === 'installment12' || row.paymentMethod === 'installment') isInstallment = true;
        if (invoiceData && invoiceData.splitPayment && (invoiceData.splitPayment.installment12 || invoiceData.splitPayment.installment)) isInstallment = true;
        if (invoiceData && invoiceData.split) {
            for (let sp of invoiceData.split) {
                if (sp.method === 'installment12' || sp.method === 'installment') isInstallment = true;
            }
        }

        let installmentDeduction = 0;
        if (isInstallment) {
            installmentDeduction = fittingAmount * 0.15;
        }

        let baseAmount = fittingAmount - lensCost - installmentDeduction;
        if (baseAmount < 0) baseAmount = 0;
        
        let bonus = baseAmount * 0.30;
        totalBonus += bonus;

        fittingData.push({
            'Дата': dateStr,
            'Пациент': row.customerName || 'Неизвестно',
            'Сумма услуги': fittingAmount,
            'Оплата': isInstallment ? 'Рассрочка' : 'Обычная',
            'Вычет за линзы': -lensCost,
            'Вычет рассрочки (-15%)': -installmentDeduction,
            'Итого база': baseAmount,
            'Бонус (30%)': bonus
        });
    }

    fittingData.push({});
    fittingData.push({ 'Дата': 'ИТОГО БОНУС ЗА ПОДБОРЫ:', 'Пациент': totalBonus });

    // Первичные Консультации
    const apptsRes = await client.query(`
        SELECT a.date, a."patientName", a.type
        FROM appointments a
        WHERE a."doctorId" = 'cmm64iwmr0007jxu35ncgntbt'
          AND a.type ILIKE '%primary%'
          AND a.date >= '2026-06-01'
        ORDER BY a.date ASC
    `);

    const salesRes = await client.query(`
        SELECT s.id, s."createdAt", s."customerName", s.total, si.name as item_name, si.total as item_total
        FROM sales s
        JOIN sale_items si ON s.id = si."saleId"
        WHERE si.name ILIKE '%консультация%'
          AND s."createdAt" >= '2026-06-01' AND s."createdAt" <= '2026-06-30 23:59:59'
    `);

    let totalConsultBonus = 0;
    const consultData = [];

    for (let appt of apptsRes.rows) {
        let dateStr = appt.date.toISOString().split('T')[0];
        let apptName = appt.patientName.toLowerCase().trim();
        
        let match = salesRes.rows.find(s => {
            let saleName = (s.customerName || '').toLowerCase().trim();
            if (!saleName) return false;
            const aParts = apptName.split(' ').filter(p => p.length >= 3);
            const sParts = saleName.split(' ').filter(p => p.length >= 3);
            if (aParts.length > 0 && sParts.length > 0) {
                return aParts.some(ap => sParts.some(sp => ap.includes(sp) || sp.includes(ap)));
            }
            return apptName.includes(saleName) || saleName.includes(apptName);
        });

        if (match) {
            let amount = Number(match.item_total);
            let bonus = amount * 0.30;
            totalConsultBonus += bonus;
            consultData.push({
                'Дата Записи': dateStr,
                'Пациент': appt.patientName,
                'Статус оплаты': 'Оплачено',
                'Сумма чека': amount,
                'Бонус (30%)': bonus
            });
        } else {
            consultData.push({
                'Дата Записи': dateStr,
                'Пациент': appt.patientName,
                'Статус оплаты': 'Нет чека за консультацию',
                'Сумма чека': 0,
                'Бонус (30%)': 0
            });
        }
    }

    consultData.push({});
    consultData.push({ 'Дата Записи': 'ИТОГО БОНУС ЗА КОНСУЛЬТАЦИИ:', 'Пациент': totalConsultBonus });

    const summaryData = [
        { 'Показатель': 'Оклад', 'Сумма': 200000 },
        { 'Показатель': 'Бонус за Подборы Ночных Линз', 'Сумма': totalBonus },
        { 'Показатель': 'Бонус за Первичные Консультации', 'Сумма': totalConsultBonus },
        { 'Показатель': 'ИТОГО К ВЫПЛАТЕ', 'Сумма': 200000 + totalBonus + totalConsultBonus },
    ];

    const wb = xlsx.utils.book_new();
    const ws1 = xlsx.utils.json_to_sheet(fittingData);
    const ws2 = xlsx.utils.json_to_sheet(consultData);
    const ws3 = xlsx.utils.json_to_sheet(summaryData);

    xlsx.utils.book_append_sheet(wb, ws1, "Подборы Ночных Линз");
    xlsx.utils.book_append_sheet(wb, ws2, "Первичные Консультации");
    xlsx.utils.book_append_sheet(wb, ws3, "Итого");

    const exportPath = '/Users/daniyarovaruslanovna/Desktop/Aigerim_Bonus_Report_June.xlsx';
    xlsx.writeFile(wb, exportPath);
    console.log("Excel report generated at", exportPath);
    await client.end();
}
run().catch(console.error);
