'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RobotoRegular } from './fonts/roboto-regular';

interface OrderData {
    order_id: string;
    patient: { name: string; phone?: string; email?: string };
    meta: { doctor?: string; optic_name?: string; created_at: string };
    company?: string;
    inn?: string;
    config: any;
    is_urgent?: boolean;
    document_name_od?: string;
    document_name_os?: string;
    delivery_method?: string;
    delivery_address?: string;
    notes?: string;
}

export function generateOrderApplicationPdf(order: OrderData): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Register Cyrillic font
    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const dateStr = new Date(order.meta.created_at).toLocaleDateString('ru-RU');

    const od = order.config?.eyes?.od || {};
    const os = order.config?.eyes?.os || {};
    const odQty = Number(od.qty) || 0;
    const osQty = Number(os.qty) || 0;

    // === HEADER ===
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text('LensFlow', margin, 18);

    doc.setFontSize(14);
    doc.setTextColor(17, 17, 17);
    doc.text('Заявка на изготовление линз', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`от ${dateStr}`, pageWidth - margin, 18, { align: 'right' });

    // Blue line
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.8);
    doc.line(margin, 22, pageWidth - margin, 22);

    // === ORDER INFO TABLE ===
    const infoRows: string[][] = [
        ['Номер заказа', order.order_id],
        ['Дата', dateStr],
        ['Пациент', order.patient.name],
    ];
    if (order.patient.phone) infoRows.push(['Телефон пациента', order.patient.phone]);
    if (order.meta.doctor) infoRows.push(['Врач', order.meta.doctor]);
    if (order.meta.optic_name) infoRows.push(['Клиника', order.meta.optic_name]);
    if (order.company) infoRows.push(['Компания', order.company]);
    if (order.inn) infoRows.push(['ИИН/БИН', order.inn]);
    if (order.delivery_method) {
        infoRows.push(['Доставка', order.delivery_method === 'pickup' ? 'Самовывоз' : 'Доставка']);
    }
    if (order.delivery_address) infoRows.push(['Адрес доставки', order.delivery_address]);
    if (order.is_urgent) infoRows.push(['Срочность', 'СРОЧНЫЙ ЗАКАЗ']);

    autoTable(doc, {
        startY: 26,
        margin: { left: margin, right: pageWidth / 2 + 5 },
        body: infoRows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2, font: 'Roboto' },
        columnStyles: {
            0: { textColor: [107, 114, 128], cellWidth: 45 },
            1: { textColor: [17, 17, 17] },
        },
    });

    // @ts-ignore
    let startY = (doc as any).lastAutoTable.finalY + 8;

    // === LENS SECTION TITLE ===
    doc.setFontSize(12);
    doc.setTextColor(17, 17, 17);
    doc.text('Параметры линз', margin, startY);
    startY += 5;

    // Build lens table
    const lensHead = ['Глаз', 'Наименование (1С)', 'Km', 'Tp', 'DIA', 'e', 'Dk', 'Кол-во'];
    const lensBody: string[][] = [];

    if (odQty > 0) {
        lensBody.push([
            'OD',
            order.document_name_od || `${od.characteristic || ''} DK ${od.dk || ''}`.trim(),
            String(od.km ?? '—'),
            String(od.tp ?? '—'),
            String(od.dia ?? '—'),
            od.e1 != null ? String(od.e1) : '—',
            String(od.dk ?? '—'),
            String(odQty),
        ]);
    }

    if (osQty > 0) {
        lensBody.push([
            'OS',
            order.document_name_os || `${os.characteristic || ''} DK ${os.dk || ''}`.trim(),
            String(os.km ?? '—'),
            String(os.tp ?? '—'),
            String(os.dia ?? '—'),
            os.e1 != null ? String(os.e1) : '—',
            String(os.dk ?? '—'),
            String(osQty),
        ]);
    }

    // Additional params table if toric
    const hasToricOd = od.characteristic === 'toric' && (od.sph != null || od.cyl != null || od.ax != null || od.tor != null);
    const hasToricOs = os.characteristic === 'toric' && (os.sph != null || os.cyl != null || os.ax != null || os.tor != null);

    autoTable(doc, {
        startY,
        margin: { left: margin, right: margin },
        head: [lensHead],
        body: lensBody,
        styles: { fontSize: 9, cellPadding: 3, font: 'Roboto', lineColor: [229, 231, 235], lineWidth: 0.3 },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontSize: 8, font: 'Roboto' },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 14, halign: 'center' },
            3: { cellWidth: 14, halign: 'center' },
            4: { cellWidth: 14, halign: 'center' },
            5: { cellWidth: 14, halign: 'center' },
            6: { cellWidth: 14, halign: 'center' },
            7: { cellWidth: 16, halign: 'center' },
        },
        theme: 'grid',
    });

    // @ts-ignore
    startY = (doc as any).lastAutoTable.finalY + 5;

    // Toric params if applicable
    if (hasToricOd || hasToricOs) {
        doc.setFontSize(10);
        doc.setTextColor(17, 17, 17);
        doc.text('Торические параметры', margin, startY);
        startY += 4;

        const toricHead = ['Глаз', 'SPH', 'CYL', 'AX', 'TOR', 'Фактор сжатия'];
        const toricBody: string[][] = [];
        if (hasToricOd) {
            toricBody.push(['OD', String(od.sph ?? '—'), String(od.cyl ?? '—'), String(od.ax ?? '—'), String(od.tor ?? '—'), String(od.compression_factor ?? '—')]);
        }
        if (hasToricOs) {
            toricBody.push(['OS', String(os.sph ?? '—'), String(os.cyl ?? '—'), String(os.ax ?? '—'), String(os.tor ?? '—'), String(os.compression_factor ?? '—')]);
        }

        autoTable(doc, {
            startY,
            margin: { left: margin, right: margin },
            head: [toricHead],
            body: toricBody,
            styles: { fontSize: 9, cellPadding: 3, font: 'Roboto', lineColor: [229, 231, 235], lineWidth: 0.3 },
            headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontSize: 8, font: 'Roboto' },
            theme: 'grid',
        });

        // @ts-ignore
        startY = (doc as any).lastAutoTable.finalY + 5;
    }

    // === NOTES ===
    if (order.notes) {
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text('Примечания:', margin, startY);
        startY += 5;
        doc.setTextColor(17, 17, 17);
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(order.notes, pageWidth - margin * 2);
        doc.text(lines, margin, startY);
        startY += lines.length * 4 + 5;
    }

    // === SIGNATURES ===
    startY += 10;
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text('Ответственный: ___________________', margin, startY);
    doc.text('Дата: ___________________', pageWidth - margin - 60, startY);

    // === SAVE ===
    doc.save(`Заявка_${order.order_id}.pdf`);
}
