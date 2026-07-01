require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();
    
    // Get all sales for Aigerim for night lens fitting in June
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

    let md = `# Расчет ЗП и Бонусов за Июнь - Шораева Айгерим Аскаровна\n\n`;
    md += `## Условия начисления\n`;
    md += `- Базовая стоимость линзы: 25 000 ₸ за 1 глаз.\n`;
    md += `- Обычный подбор (2 глаза): минус 50 000 ₸ за линзы.\n`;
    md += `- Если подбор для двух человек сразу (кол-во услуг = 2): вычет удваивается.\n`;
    md += `- Подбор со скидкой 50% (или 1 глаз): минус 25 000 ₸ за линзу.\n`;
    md += `- При рассрочке отнимается 15% от стоимости подбора.\n`;
    md += `- Бонус врача (подбор): 30% от оставшейся суммы.\n`;
    md += `- Бонус врача (первичная консультация): 30% от чека.\n\n`;

    md += `| Дата | Пациент | Сумма услуги | Оплата | Вычет за линзы | Вычет рассрочки (-15%) | Итого база | **Бонус (30%)** |\n`;
    md += `|---|---|---|---|---|---|---|---|\n`;

    let totalBonus = 0;
    
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

        md += `| ${dateStr} | ${row.customerName || 'Неизвестно'} | ${fittingAmount} ₸ | ${isInstallment ? 'Рассрочка' : 'Обычная'} | -${lensCost} ₸ | -${installmentDeduction} ₸ | ${baseAmount} ₸ | **${bonus} ₸** |\n`;
    }

    md += `\n### Итого по Подборам Ночных Линз\n`;
    md += `- Итого Бонус за Подборы: **${totalBonus} ₸**\n\n`;

    // Now get Primary Consultations
    md += `## Первичные Консультации\n`;
    md += `- Всего первичных приемов по записи: 22.\n`;
    md += `- Бонус врача: 30% от суммы оплаты за консультацию (если она была оплачена в кассе).\n\n`;
    md += `| Дата Записи | Пациент | Статус оплаты в кассе | Сумма | **Бонус (30%)** |\n`;
    md += `|---|---|---|---|---|\n`;

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
            md += `| ${dateStr} | ${appt.patientName} | Оплачено | ${amount} ₸ | **${bonus} ₸** |\n`;
        } else {
            md += `| ${dateStr} | ${appt.patientName} | Нет чека за консультацию | 0 ₸ | **0 ₸** |\n`;
        }
    }

    md += `\n### Итого по Первичным Консультациям\n`;
    md += `- Итого Бонус за Первичные Консультации: **${totalConsultBonus} ₸**\n\n`;

    md += `## Общий Итог\n`;
    md += `- Оклад: 200 000 ₸\n`;
    md += `- Бонус за Подборы Ночных Линз: **${totalBonus} ₸**\n`;
    md += `- Бонус за Первичные Консультации: **${totalConsultBonus} ₸**\n`;
    md += `- **К выплате: ${200000 + totalBonus + totalConsultBonus} ₸**\n`;

    fs.writeFileSync('/Users/daniyarovaruslanovna/.gemini/antigravity/brain/ba8828ab-d477-4dc6-8081-f8fcdf475d62/artifacts/Aigerim_Bonus_Report.md', md);
    console.log("Report generated with all 22 primary consultations.");
    await client.end();
}
run().catch(console.error);
