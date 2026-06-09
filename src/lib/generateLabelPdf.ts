'use client';

import jsPDF from 'jspdf';
import { RobotoRegular } from './fonts/roboto-regular';

interface LabelOrder {
    order_id: string;
    patient: { name: string };
    meta: { optic_name?: string };
    config: {
        eyes: {
            od: EyeData;
            os: EyeData;
        };
    };
    ready_at?: string;
    production_started_at?: string;
}

interface EyeData {
    characteristic?: string;
    km?: number;
    tp?: number;
    dia?: number;
    e1?: number;
    e2?: number;
    tor?: number;
    trial?: boolean;
    color?: string;
    dk?: string;
    apical_clearance?: number;
    compression_factor?: number;
    qty?: number;
    isRgp?: boolean;
}

function fmt(val: number | undefined | null): string {
    if (val == null) return '—';
    return String(val).replace('.', ',');
}

function pair(odVal: number | undefined | null, osVal: number | undefined | null): string {
    return `${fmt(odVal)}/${fmt(osVal)}`;
}

function generateBarcodeDataUrl(text: string): string {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 60;
        const JsBarcode = (window as any).JsBarcode;
        if (JsBarcode) {
            JsBarcode(canvas, text, {
                format: 'CODE128',
                width: 2,
                height: 50,
                displayValue: false,
                margin: 0,
            });
            return canvas.toDataURL('image/png');
        }
    } catch (e) {
        console.warn('Barcode generation failed:', e);
    }
    return '';
}

export async function generateLabelPdf(order: LabelOrder): Promise<void> {
    if (!(window as any).JsBarcode) {
        await new Promise<void>((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
            script.onload = () => resolve();
            script.onerror = () => { console.warn('JsBarcode CDN failed'); resolve(); };
            document.head.appendChild(script);
        });
    }

    const od = (order.config?.eyes?.od || { km: "-", dia: "-", dk: "-", qty: 0 }) || ({} as EyeData);
    const os = (order.config?.eyes?.os || { km: "-", dia: "-", dk: "-", qty: 0 }) || ({} as EyeData);

    const W = 46;
    const H = 35;
    
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [H, W] });

    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold');

    // ===== BACKGROUND =====
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');

    // ===== TOP: LOGO + PRODUCT NAME =====
    // Black circle
    doc.setFillColor(0, 0, 0);
    doc.circle(4.5, 3.5, 1.8, 'F');
    // White mask over left half
    doc.setFillColor(255, 255, 255);
    doc.rect(2.7, 1.5, 1.8, 4, 'F');
    // Grey blob
    doc.setFillColor(200, 200, 200);
    doc.circle(3.2, 3.5, 1.3, 'F');
    
    // MediLens
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('MediLens', 6.5, 4.5);

    // Quantity — large number
    const totalQty = (Number(od.qty) || 0) + (Number(os.qty) || 0);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(18);
    doc.text(String(totalQty), 44, 5.5, { align: 'right' });
    const qtyW = doc.getTextWidth(String(totalQty));

    // Product name
    const charLabel = od.characteristic === 'toric' ? 'Toric' : od.characteristic === 'spherical' ? 'Spherical' : '';
    const dkVal = od.dk || os.dk || '';
    const productName = `Линза MediLens ${charLabel} ${dkVal}`.trim();
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(4);
    doc.setTextColor(80, 80, 80);
    doc.text(productName, 44 - qtyW - 1, 3.5, { align: 'right' });
    
    const colorOd = od.color || '';
    const colorOs = os.color || '';
    const colorStr = colorOd && colorOs && colorOd !== colorOs
        ? `${colorOd}/${colorOs}`
        : colorOd || colorOs || '';
    doc.text(colorStr, 44 - qtyW - 1, 5, { align: 'right' });

    // ===== FIRST DIVIDER =====
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(0, 7, W, 7);

    // ===== PATIENT ROW =====
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(4);
    doc.setTextColor(100, 100, 100);
    doc.text(order.order_id, 2, 9.5);

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(order.patient.name || '—', W / 2, 10, { align: 'center' });

    const eyeLabel = (od.qty && os.qty) ? 'OD/OS' : (od.qty ? 'OD' : (os.qty ? 'OS' : 'OD/OS'));
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    doc.text(eyeLabel, 44, 9.5, { align: 'right' });

    // ===== SECOND DIVIDER =====
    doc.setDrawColor(0, 0, 0);
    doc.line(0, 11.5, W, 11.5);

    // ===== PARAMETERS =====
    doc.setTextColor(0, 0, 0);

    // Row 1
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7.5);
    doc.text(pair(od.km, os.km), 2, 15);
    
    doc.text(pair(od.tp, os.tp), 23, 15, { align: 'center' });

    const diaVal = pair(od.dia, os.dia);
    doc.text(diaVal, 44, 15, { align: 'right' });
    const diaW = doc.getTextWidth(diaVal);
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(5.5);
    doc.text('D ', 44 - diaW, 15, { align: 'right' });

    // Row 2
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(5.5);
    doc.text('T ', 2, 19);
    const tW = doc.getTextWidth('T ');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7.5);
    doc.text(pair(od.tor, os.tor), 2 + tW, 19);

    let fVal = '';
    if (od.apical_clearance != null || os.apical_clearance != null) {
        fVal = pair(od.apical_clearance, os.apical_clearance);
    } else if (od.compression_factor != null || os.compression_factor != null) {
        fVal = pair(od.compression_factor, os.compression_factor);
    } else {
        fVal = pair(null, null);
    }
    const fW = doc.getTextWidth(fVal);
    doc.text(fVal, 23 + 1.5, 19, { align: 'center' });
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(5.5);
    const fCenterStart = 23 + 1.5 - (fW / 2) - doc.getTextWidth('F+ ');
    doc.text('F+ ', fCenterStart, 19);

    // Row 2 Right (E values stacked)
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6.5);
    doc.text(pair(od.e1, os.e1), 44, 18, { align: 'right' });
    doc.text(pair(od.e2, os.e2), 44, 20.5, { align: 'right' });

    // ===== CLINIC + Dk =====
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(4);
    doc.setTextColor(100, 100, 100);
    doc.text(order.meta.optic_name || '', 2, 24);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(6.5);
    doc.text('Dk', 19, 24.5);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(14);
    doc.text(String(dkVal), 23, 24.5);

    // ===== BARCODE =====
    const barcodeUrl = generateBarcodeDataUrl(order.order_id);
    if (barcodeUrl) {
        try {
            doc.addImage(barcodeUrl, 'PNG', 2, 26, 42, 4.5);
        } catch {
            drawPlaceholderBars(doc, 2, 26, 42, 4.5);
        }
    } else {
        drawPlaceholderBars(doc, 2, 26, 42, 4.5);
    }

    // ===== FOOTER =====
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(3.5);
    doc.setTextColor(80, 80, 80);
    doc.text('Қазақстанда жасалған. ЖШС "MedInnVision Lab"', 2, 32.5);
    doc.text('Жарамдылық мерзімі өндірілген күнінен бастап 5 жыл.', 2, 34);

    const readyDate = order.ready_at
        ? new Date(order.ready_at).toLocaleDateString('ru-RU')
        : order.production_started_at
            ? new Date(order.production_started_at).toLocaleDateString('ru-RU')
            : new Date().toLocaleDateString('ru-RU');

    doc.text('Өндірілген күні:', 44, 32.5, { align: 'right' });
    doc.text(readyDate, 44, 34, { align: 'right' });

    // ===== SAVE =====
    doc.save(`Этикетка_${order.order_id}.pdf`);
}

function drawPlaceholderBars(doc: jsPDF, x: number, y: number, w: number, h: number) {
    doc.setFillColor(0, 0, 0);
    const seed = 42;
    for (let i = 0; i < 40; i++) {
        const barW = ((i * seed) % 3 === 0) ? 0.6 : 0.3;
        doc.rect(x + i * 1.05, y, barW, h, 'F');
    }
}
