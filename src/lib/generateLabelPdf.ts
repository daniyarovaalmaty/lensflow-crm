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
    // Dynamically load JsBarcode from CDN
    if (!(window as any).JsBarcode) {
        await new Promise<void>((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
            script.onload = () => resolve();
            script.onerror = () => { console.warn('JsBarcode CDN failed'); resolve(); };
            document.head.appendChild(script);
        });
    }

    const od = order.config.eyes.od || ({} as EyeData);
    const os = order.config.eyes.os || ({} as EyeData);

    // Label dimensions (mm)
    const W = 130;
    const H = 99;
    const m = 5; // margin

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [H, W] });

    // Register Cyrillic font
    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto', 'normal');

    let y = 0;

    // ===== BACKGROUND =====
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');

    // ===== TOP: LOGO + PRODUCT NAME =====
    y = m + 3;

    // Moon icon
    doc.setFillColor(0, 0, 0);
    doc.circle(m + 4, y + 2, 4, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(m + 6.5, y + 1, 3.5, 'F');

    // "MediLens" brand
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('MediLens', m + 12, y + 4);

    // Product name — top right
    const charLabel = od.characteristic === 'toric' ? 'Toric' : od.characteristic === 'spherical' ? 'Spherical' : '';
    const dkVal = od.dk || os.dk || '';
    const productName = `Линза MediLens ${charLabel} ${dkVal}`.trim();
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8);
    doc.text(productName, W - m - 14, y - 1);

    // Color
    const colorOd = od.color || '';
    const colorOs = os.color || '';
    const colorStr = colorOd && colorOs && colorOd !== colorOs
        ? `${colorOd}/${colorOs}`
        : colorOd || colorOs || '';
    if (colorStr) {
        doc.setFontSize(7);
        doc.text(colorStr, W - m - 14, y + 3);
    }

    // Quantity — large number
    const totalQty = (Number(od.qty) || 0) + (Number(os.qty) || 0);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(30);
    doc.text(String(totalQty), W - m, y + 5, { align: 'right' });

    // ===== DIVIDER =====
    y = 18;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(m, y, W - m, y);

    // ===== PATIENT ROW =====
    y += 5;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`${order.order_id}:`, m, y);

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(order.patient.name || '—', W / 2, y, { align: 'center' });

    // OD/OS
    const eyeLabel = (od.qty && os.qty) ? 'OD/OS' : (od.qty ? 'OD' : (os.qty ? 'OS' : 'OD/OS'));
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(9);
    doc.text(eyeLabel, W - m, y, { align: 'right' });

    // ===== PARAMETERS =====
    y += 10;
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(0, 0, 0);

    // Row 1: Km | TP | D (DIA)
    doc.setFontSize(16);
    doc.text(pair(od.km, os.km), m, y);
    doc.text(pair(od.tp, os.tp), W / 2 - 10, y, { align: 'center' });
    doc.setFontSize(10);
    doc.text('D', W / 2 + 18, y);
    doc.setFontSize(16);
    doc.text(pair(od.dia, os.dia), W / 2 + 24, y);

    // Row 2: T (tor) | F+ (apical clearance) | E values
    y += 10;
    doc.setFontSize(10);
    doc.text('T', m, y);
    doc.setFontSize(16);
    doc.text(pair(od.tor, os.tor), m + 6, y);

    doc.setFontSize(10);
    doc.text('F+', W / 2 - 16, y);
    doc.setFontSize(16);
    doc.text(pair(od.apical_clearance, os.apical_clearance), W / 2 - 9, y);

    // E values — od.e1/od.e2 first line, os.e1/os.e2 second line
    doc.setFontSize(14);
    doc.text(`${fmt(od.e1)}/${fmt(od.e2)}`, W - m, y - 2, { align: 'right' });
    doc.text(`${fmt(os.e1)}/${fmt(os.e2)}`, W - m, y + 5, { align: 'right' });

    // ===== CLINIC + Dk =====
    y += 14;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8);
    doc.text(order.meta.optic_name || '', m, y);

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(10);
    doc.text('Dk', W / 2 - 4, y + 2);
    doc.setFontSize(26);
    doc.text(String(dkVal), W / 2 + 5, y + 3);

    // ===== BARCODE =====
    y += 8;
    const barcodeUrl = generateBarcodeDataUrl(order.order_id);
    if (barcodeUrl) {
        try {
            doc.addImage(barcodeUrl, 'PNG', m, y, W - m * 2, 12);
        } catch {
            drawPlaceholderBars(doc, m, y, W);
        }
    } else {
        drawPlaceholderBars(doc, m, y, W);
    }

    // ===== FOOTER =====
    y += 16;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(0, 0, 0);
    doc.text('Қазақстанда жасалған. ЖШС "MedInnVision Lab"', m, y);
    doc.text('Жарамдылық мерзімі өндірілген күнінен бастап 5 жыл.', m, y + 3);

    // Production date
    const readyDate = order.ready_at
        ? new Date(order.ready_at).toLocaleDateString('ru-RU')
        : order.production_started_at
            ? new Date(order.production_started_at).toLocaleDateString('ru-RU')
            : new Date().toLocaleDateString('ru-RU');

    doc.text('Өндірілген күні:', W - m, y, { align: 'right' });
    doc.text(readyDate, W - m, y + 3, { align: 'right' });

    // ===== SAVE =====
    doc.save(`Этикетка_${order.order_id}.pdf`);
}

function drawPlaceholderBars(doc: jsPDF, m: number, y: number, W: number) {
    doc.setFillColor(0, 0, 0);
    const seed = 42;
    for (let i = 0; i < 40; i++) {
        const barW = ((i * seed) % 3 === 0) ? 1.5 : 0.8;
        doc.rect(m + i * 2.8, y, barW, 12, 'F');
    }
}
