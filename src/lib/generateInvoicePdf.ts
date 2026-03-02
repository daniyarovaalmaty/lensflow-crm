'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceOrder {
    order_id: string;
    patient: { name: string };
    meta: { doctor?: string; created_at: string };
    company?: string;
    config: any;
    is_urgent?: boolean;
    total_price?: number;
    discount_percent?: number;
    document_name_od?: string;
    document_name_os?: string;
    price_od?: number;
    price_os?: number;
    products?: Array<{ name: string; qty: number; price: number }>;
}

const PRICE_PER_LENS = 17500; // fallback

export function generateInvoicePdf(order: InvoiceOrder): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    const od = order.config.eyes.od;
    const os = order.config.eyes.os;
    const odQty = Number(od.qty) || 0;
    const osQty = Number(os.qty) || 0;
    const additionalProducts = order.products || [];
    const discountPct = order.discount_percent ?? 5;
    const isUrgent = order.is_urgent || false;
    const URGENT_PCT = 25;
    const dateStr = new Date(order.meta.created_at).toLocaleDateString('ru-RU');
    const fmt = (n: number) => n.toLocaleString('ru-RU');

    const odUnitPrice = order.price_od || (odQty > 0 ? PRICE_PER_LENS : 0);
    const osUnitPrice = order.price_os || (osQty > 0 ? PRICE_PER_LENS : 0);

    // === HEADER ===
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235); // blue
    doc.text('LensFlow', margin, 20);

    doc.setFontSize(14);
    doc.setTextColor(17, 17, 17);
    doc.text(`Счёт №${order.order_id}`, pageWidth - margin, 18, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`от ${dateStr}`, pageWidth - margin, 24, { align: 'right' });

    // Blue line
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.8);
    doc.line(margin, 28, pageWidth - margin, 28);

    // === PATIENT INFO ===
    doc.setFontSize(10);
    doc.setTextColor(17, 17, 17);
    let infoText = `Пациент: ${order.patient.name}  |  Врач: ${order.meta.doctor || '—'}`;
    if (order.company) infoText += `  |  Компания: ${order.company}`;
    doc.text(infoText, margin, 36);

    // === TABLE ===
    const tableRows: (string | number)[][] = [];
    let rowNum = 1;
    let subtotal = 0;

    if (odQty > 0) {
        const lineTotal = odQty * odUnitPrice;
        subtotal += lineTotal;
        const params = `Km ${od.km || '—'}, DIA ${od.dia || '—'}, Dk ${od.dk || '—'}`;
        tableRows.push([
            rowNum++,
            order.document_name_od || 'MediLens — OD',
            params,
            odQty,
            `${fmt(odUnitPrice)} ₸`,
            `${fmt(lineTotal)} ₸`
        ]);
    }

    if (osQty > 0) {
        const lineTotal = osQty * osUnitPrice;
        subtotal += lineTotal;
        const params = `Km ${os.km || '—'}, DIA ${os.dia || '—'}, Dk ${os.dk || '—'}`;
        tableRows.push([
            rowNum++,
            order.document_name_os || 'MediLens — OS',
            params,
            osQty,
            `${fmt(osUnitPrice)} ₸`,
            `${fmt(lineTotal)} ₸`
        ]);
    }

    for (const prod of additionalProducts) {
        const pPrice = prod.price || 0;
        const pQty = prod.qty || 1;
        const lineTotal = pPrice * pQty;
        subtotal += lineTotal;
        tableRows.push([
            rowNum++,
            prod.name,
            '—',
            pQty,
            `${fmt(pPrice)} ₸`,
            `${fmt(lineTotal)} ₸`
        ]);
    }

    autoTable(doc, {
        startY: 42,
        margin: { left: margin, right: margin },
        head: [['№', 'Наименование', 'Параметры', 'Кол-во', 'Цена', 'Сумма']],
        body: tableRows,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [229, 231, 235],
            lineWidth: 0.3,
        },
        headStyles: {
            fillColor: [243, 244, 246],
            textColor: [55, 65, 81],
            fontStyle: 'bold',
            fontSize: 8,
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35, halign: 'center', fontSize: 8 },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
        },
        theme: 'grid',
    });

    // === TOTALS ===
    const discountAmt = Math.round(subtotal * discountPct / 100);
    const afterDiscount = subtotal - discountAmt;
    const urgentAmt = isUrgent ? Math.round(afterDiscount * URGENT_PCT / 100) : 0;
    const grandTotal = order.total_price || (afterDiscount + urgentAmt);

    // @ts-ignore - autoTable adds lastAutoTable
    let y = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('Сумма без скидки:', pageWidth - margin - 50, y);
    doc.setTextColor(17, 17, 17);
    doc.text(`${fmt(subtotal)} ₸`, pageWidth - margin, y, { align: 'right' });

    y += 7;
    doc.setTextColor(5, 150, 105); // green
    doc.text(`Скидка ${discountPct}%:`, pageWidth - margin - 50, y);
    doc.text(`-${fmt(discountAmt)} ₸`, pageWidth - margin, y, { align: 'right' });

    if (isUrgent) {
        y += 7;
        doc.setTextColor(217, 119, 6); // amber
        doc.text(`Срочность +${URGENT_PCT}%:`, pageWidth - margin - 50, y);
        doc.text(`+${fmt(urgentAmt)} ₸`, pageWidth - margin, y, { align: 'right' });
    }

    y += 3;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - margin - 80, y, pageWidth - margin, y);

    y += 8;
    doc.setFontSize(14);
    doc.setTextColor(17, 17, 17);
    doc.text('Итого:', pageWidth - margin - 50, y);
    doc.text(`${fmt(grandTotal)} ₸`, pageWidth - margin, y, { align: 'right' });

    // === SAVE ===
    doc.save(`Счёт_${order.order_id}.pdf`);
}
