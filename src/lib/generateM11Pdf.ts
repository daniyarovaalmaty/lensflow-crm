'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RobotoRegular } from './fonts/roboto-regular';

/*
 * Map Russian color names → English material names by DK
 * DK 50  → Contraperm F2Mid (пробная)
 * DK 100 → Optimum extra
 * DK 125 → Optimum extreme
 * DK 180 → Optimum infinite
 */
const DK_BRAND: Record<string, string> = {
    '50': 'Contraperm F2Mid',
    '100': 'Optimum extra',
    '125': 'Optimum extreme',
    '180': 'Optimum infinite',
};

const COLOR_MAP: Record<string, string> = {
    'Синий': 'blue',
    'Зелёный': 'green',
    'Фиолетовый': 'violet',
    'Красный': 'red',
    'Голубой': 'blue',
    'Салатовый': 'green',
    'Тёмно-синий': 'dark blue',
    'Тёмно-зелёный': 'green',
};

const DOC_NAME_BY_DK: Record<string, string> = {
    '50': 'Линзы контактные жесткие корригирующие OKV-RGP пробная DK 50',
    '100': 'Линзы контактные жесткие корригирующие ОКV - RGP сферические/торическая. DK 100',
    '125': 'Линзы контактные жесткие корригирующие ОКV - RGP сферические/торическая. DK 125',
    '180': 'Линзы контактные жесткие корригирующие ОКV - RGP сферические/торическая. DK 180',
};

interface OrderForM11 {
    order_id: string;
    config: {
        eyes: {
            od?: { qty?: number; dk?: number | string; color?: string; characteristic?: string };
            os?: { qty?: number; dk?: number | string; color?: string; characteristic?: string };
        };
    };
    defects?: Array<{ qty?: number; eye?: string }>;
    is_urgent?: boolean;
}

interface BlankEntry {
    material: string;    // e.g. "Optimum extra green"
    doc_name: string;    // 1C document name
    qty: number;
}

export function generateM11Pdf(orders: OrderForM11[], docNumber?: string): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Register Cyrillic font
    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 12;
    const dateStr = new Date().toLocaleDateString('ru-RU');

    // ── Aggregate blanks ──
    const blankMap = new Map<string, BlankEntry>();
    const defectMap = new Map<string, BlankEntry>();
    let totalBlanks = 0;
    let isKit = false;

    for (const order of orders) {
        for (const side of ['od', 'os'] as const) {
            const eye = order.config?.eyes?.[side];
            if (!eye || !Number(eye.qty)) continue;

            const qty = Number(eye.qty);
            const dk = String(eye.dk || '100');
            const color = eye.color || '';
            const eng = COLOR_MAP[color] || color.toLowerCase() || 'green';
            const brand = DK_BRAND[dk] || `DK ${dk}`;
            const material = `${brand} ${eng}`;
            const docName = DOC_NAME_BY_DK[dk] || `DK ${dk}`;

            const key = `${dk}-${eng}`;
            const existing = blankMap.get(key);
            if (existing) {
                existing.qty += qty;
            } else {
                blankMap.set(key, { material, doc_name: docName, qty });
            }
            totalBlanks += qty;
        }

        // Defects
        if (order.defects) {
            for (const d of order.defects) {
                const dQty = Number(d.qty) || 1;
                // For defects, add to defect map
                // We don't always know which specific blank it was, so count generically
                const defKey = 'defect-general';
                const existing = defectMap.get(defKey);
                if (existing) {
                    existing.qty += dQty;
                } else {
                    defectMap.set(defKey, { material: 'БРАК (общий)', doc_name: '', qty: dQty });
                }
            }
        }
    }

    // ── HEADER ──
    doc.setFontSize(12);
    doc.text('ТРЕБОВАНИЕ-НАКЛАДНАЯ', pageW / 2, 14, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`№ ${docNumber || '______'}`, pageW / 2, 19, { align: 'center' });

    doc.setFontSize(8);
    doc.text('ТОО "Medinn Vision Lab"', margin, 26);
    doc.text(`Дата составления: ${dateStr}`, pageW - margin, 26, { align: 'right' });
    doc.text('Отправитель: Основной склад', margin, 31);
    doc.text('Получатель: Основное подразделение', margin, 35);

    // ── TABLE ──
    const head = [['Счёт', 'Наименование материала', 'Наименование (1С)', 'Ед.', 'Затребовано', 'Отпущено']];
    const body: string[][] = [];
    let rowNum = 0;

    // Blanks
    for (const [, entry] of blankMap) {
        rowNum++;
        body.push(['1310', entry.material, entry.doc_name, 'шт', String(entry.qty), 'ШТ']);
    }

    // Consumables
    const totalLenses = totalBlanks;
    const consumables = [
        { name: 'блистер двойной (1 линза)', qty: totalLenses },
        { name: 'блистер односторонний (1 линза для диагност. набора)', qty: isKit ? totalLenses : 0 },
        { name: 'бочонки для набора (126)', qty: 0 },
        { name: 'этикетка с рулона (1 линза)', qty: totalLenses },
        { name: 'этикетка/наклейка для набора', qty: 0 },
        { name: 'воск', qty: Math.round(totalLenses * 0.05 * 100) / 100, unit: 'МЛГ' },
        { name: 'контропол', qty: Math.round(totalLenses * 0.05 * 100) / 100, unit: 'МЛГ' },
        { name: 'Коробка большая (126)', qty: 0 },
        { name: 'Коробка маленькая (14шт)', qty: 0 },
        { name: 'Коробка маленькая (28шт)', qty: 0 },
    ];

    for (const c of consumables) {
        body.push(['1310', c.name, '', (c as any).unit || 'шт', String(c.qty), '']);
    }

    // Defects (same blanks + БРАК)
    for (const [, entry] of blankMap) {
        body.push(['1310', `${entry.material} (БРАК)`, entry.doc_name, 'шт', '', '']);
    }

    autoTable(doc, {
        startY: 39,
        margin: { left: margin, right: margin },
        head,
        body,
        styles: { fontSize: 7.5, cellPadding: 2, font: 'Roboto', lineColor: [180, 180, 180], lineWidth: 0.3 },
        headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontSize: 7, fontStyle: 'normal', font: 'Roboto' },
        columnStyles: {
            0: { cellWidth: 16, halign: 'center' },
            1: { cellWidth: 70 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 14, halign: 'center' },
            4: { cellWidth: 22, halign: 'center' },
            5: { cellWidth: 22, halign: 'center' },
        },
        theme: 'grid',
    });

    // @ts-ignore
    let y = (doc as any).lastAutoTable.finalY + 10;

    // Signatures
    doc.setFontSize(8);
    doc.text('Через кого ___________________________________________', margin, y);
    y += 6;
    doc.text('Затребовал ________________________', margin, y);
    doc.text('Разрешил ________________________', pageW / 2, y);
    y += 6;
    doc.text('Отпустил ________________________', margin, y);
    doc.text('Получил ________________________', pageW / 2, y);

    doc.save(`М-11_Требование_накладная_${dateStr.replace(/\./g, '-')}.pdf`);
}
