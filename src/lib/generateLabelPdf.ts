'use client';

import jsPDF from 'jspdf';
import { RobotoRegular } from './fonts/roboto-regular';

interface LabelOrder {
    order_id: string;
    patient: { name: string };
    meta: { doctor?: string; created_at: string };
    company?: string;
    config: any;
}

/**
 * Generate lens label PDF matching the MedInnVision Lab sticker format.
 * 
 * Label layout (from physical template):
 *   qty     MedInnVision Lab
 *   Линза MediLens [type] [dk] [color]
 *   [order_id]: [patient] OD/OS
 *   [km_od/km_os]  [tp_od/tp_os]  D [dia_od/dia_os]
 *   T [tor_od/tor_os]  F [e1_od/e1_os]  [e2_od/e2_os]
 *                                       [apical_od/apical_os]
 *   Өндірілген күні [date]         DK [dk]
 *   Центр Ортокератологии
 *   Legal text in Kazakh
 *   [barcode]
 */
export function generateLabelPdf(order: LabelOrder): void {
    const od = order.config?.eyes?.od || {};
    const os = order.config?.eyes?.os || {};
    const odQty = Number(od.qty) || 0;
    const osQty = Number(os.qty) || 0;
    const totalQty = odQty + osQty;

    // Determine lens type description
    const characteristic = od.characteristic || os.characteristic || '';
    const isToric = characteristic.toLowerCase().includes('toric') || characteristic.toLowerCase().includes('торическ');
    const typeStr = isToric ? 'Toric' : 'Spheric';

    // DK value
    const dk = od.dk || os.dk || '';

    // Color
    const color = od.color || os.color || '';

    // Determine if trial (DK=50 means пробная)
    const isTrial = dk === '50' || dk === 50;

    // Build lens description
    let lensDesc = `Линза MediLens ${typeStr}`;
    if (dk) lensDesc += ` ${dk}`;
    if (color) lensDesc += ` ${color}`;

    // Eyes string
    const eyesList: string[] = [];
    if (odQty > 0) eyesList.push('OD');
    if (osQty > 0) eyesList.push('OS');
    const eyesStr = eyesList.join('/');

    // Format value helper — handles undefined/null
    const fv = (v: any): string => {
        if (v == null || v === '' || v === undefined) return '—';
        return String(v).replace('.', ',');
    };

    // Format paired values: od/os
    const pair = (odVal: any, osVal: any): string => {
        if (odQty > 0 && osQty > 0) return `${fv(odVal)}/${fv(osVal)}`;
        if (odQty > 0) return fv(odVal);
        return fv(osVal);
    };

    // Production date
    const prodDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // ===== Generate PDF =====
    // Label size: approximately 80mm x 50mm
    const labelW = 80;
    const labelH = 55;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [labelH, labelW] });

    // Register Cyrillic font
    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto', 'normal');

    const m = 3; // margin
    let y = 5;

    // Row 1: Quantity + Company name
    doc.setFontSize(14);
    doc.setFont('Roboto', 'bold');
    doc.text(String(totalQty), m, y);

    doc.setFontSize(9);
    doc.setFont('Roboto', 'bold');
    doc.text('MedInnVision Lab', labelW - m, y, { align: 'right' });

    // Row 2: Lens description
    y += 4;
    doc.setFontSize(7);
    doc.setFont('Roboto', 'bold');
    doc.text(lensDesc, m, y);

    // Row 3: Order ID: Patient OD/OS
    y += 3.5;
    doc.setFontSize(7);
    doc.setFont('Roboto', 'bold');
    doc.text(`${order.order_id}: ${order.patient.name} ${eyesStr}`, m, y);

    // Row 4: Km, TP, DIA values
    y += 4;
    doc.setFontSize(6.5);
    doc.setFont('Roboto', 'normal');
    const kmStr = pair(od.km, os.km);
    const tpStr = pair(od.tp, os.tp);
    const diaStr = `D ${pair(od.dia, os.dia)}`;
    doc.text(kmStr, m, y);
    doc.text(tpStr, m + 22, y);
    doc.text(diaStr, m + 44, y);

    // Row 5: Tor, F (e1), E (e2) values
    y += 3.5;
    const torOd = od.tor != null ? od.tor : '—';
    const torOs = os.tor != null ? os.tor : '—';
    const torStr = `T ${pair(torOd, torOs)}`;
    const e1Str = `F ${pair(od.e1, os.e1)}`;
    const e2Str = pair(od.e2, os.e2);
    doc.text(torStr, m, y);
    doc.text(e1Str, m + 22, y);
    doc.text(e2Str, m + 44, y);

    // Row 6: Apical clearance / Compression factor
    y += 3;
    const apicalStr = pair(od.apical_clearance, os.apical_clearance);
    const comprStr = pair(od.compression_factor, os.compression_factor);
    if (apicalStr !== '—' || comprStr !== '—') {
        doc.text(apicalStr, m + 44, y);
    }

    // Row 7: Production date + DK
    y += 4;
    doc.setFontSize(6.5);
    doc.setFont('Roboto', 'normal');
    doc.text(`Өндірілген күні ${prodDate}`, m, y);
    doc.setFontSize(10);
    doc.setFont('Roboto', 'bold');
    doc.text(`DK ${dk}`, labelW - m, y, { align: 'right' });

    // Row 8: Center name
    y += 3.5;
    doc.setFontSize(6.5);
    doc.setFont('Roboto', 'bold');
    doc.text('Центр Ортокератологии', m, y);

    // Row 9-10: Legal text in Kazakh
    y += 3.5;
    doc.setFontSize(5);
    doc.setFont('Roboto', 'normal');
    doc.text('Қазақстанда жасалған ЖШС "MedInnVision', m, y);
    y += 2.5;
    doc.text('Lab" Жарамдылық мерзімі өндірілген', m, y);
    y += 2.5;
    doc.text('күнінен бастап 5 жыл.', m, y);

    // Simple barcode (Code 39 style — just visual lines)
    y += 3;
    const barcodeData = order.order_id.replace(/[^A-Z0-9\-]/gi, '');
    const barcodeX = m;
    const barcodeW = labelW - m * 2;
    const barHeight = 6;

    doc.setDrawColor(0, 0, 0);
    // Generate simple barcode-like pattern from order ID
    const chars = barcodeData.split('');
    const totalBars = chars.length * 5;
    const barWidth = barcodeW / totalBars;
    let bx = barcodeX;

    for (let i = 0; i < chars.length; i++) {
        const charCode = chars[i].charCodeAt(0);
        // Create a pattern based on char code
        for (let j = 0; j < 5; j++) {
            const isBlack = (charCode >> j) & 1;
            if (isBlack) {
                const w = barWidth * (j % 2 === 0 ? 1 : 0.6);
                doc.setFillColor(0, 0, 0);
                doc.rect(bx, y, Math.max(w, 0.3), barHeight, 'F');
            }
            bx += barWidth;
        }
    }

    // Save the PDF
    doc.save(`Этикетка_${order.order_id}.pdf`);
}
