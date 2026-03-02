'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RobotoRegular } from './fonts/roboto-regular';

interface LensLine {
    name1c: string;       // e.g. "Линзы контактные жесткие корригирующие OKV-RGP OK торические. DK 100"
    code?: string;        // номенклатурный номер
    qty: number;
    price: number;        // цена за единицу
}

interface OrderForZ2 {
    order_id: string;
    config: {
        eyes: {
            od?: { qty?: number; dk?: number | string; characteristic?: string };
            os?: { qty?: number; dk?: number | string; characteristic?: string };
        };
    };
    meta: { optic_name?: string; doctor?: string };
    document_name_od?: string;
    document_name_os?: string;
}

interface CatalogProduct {
    name: string;
    name1c?: string;
    code?: string;
    price: number;
    category?: string;
}

function getLensKey(dk: string, char: string): string {
    return `${char}-${dk}`;
}

function getLens1CName(dk: string, char: string): string {
    const type = char === 'toric' ? 'торические' : 'сферические';
    return `Линзы контактные жесткие корригирующие OKV-RGP OK ${type}. DK ${dk}`;
}

export function generateZ2Pdf(
    orders: OrderForZ2[],
    catalog: CatalogProduct[],
    docNumber?: string,
    responsible?: string
): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 10;
    const dateStr = new Date().toLocaleDateString('ru-RU');

    // ── Aggregate lenses ──
    const lensMap = new Map<string, LensLine>();

    for (const order of orders) {
        for (const side of ['od', 'os'] as const) {
            const eye = order.config?.eyes?.[side];
            if (!eye || !Number(eye.qty)) continue;

            const qty = Number(eye.qty);
            const dk = String(eye.dk || '100');
            const char = eye.characteristic || 'spherical';
            const key = getLensKey(dk, char);

            // Try to find matching catalog product for price
            const docName = side === 'od' ? order.document_name_od : order.document_name_os;
            const name1c = docName || getLens1CName(dk, char);

            // Find price from catalog
            let price = 0;
            let code = '';
            const matchProduct = catalog.find(p => {
                if (p.name1c && name1c && p.name1c.toLowerCase().includes(dk) &&
                    p.name1c.toLowerCase().includes(char === 'toric' ? 'тор' : 'сфер')) return true;
                if (p.name && p.name.toLowerCase().includes(dk) &&
                    p.name.toLowerCase().includes(char === 'toric' ? 'тор' : 'сфер')) return true;
                return false;
            });
            if (matchProduct) {
                price = matchProduct.price || 0;
                code = matchProduct.code || '';
            }

            const existing = lensMap.get(key);
            if (existing) {
                existing.qty += qty;
            } else {
                lensMap.set(key, { name1c, code, qty, price });
            }
        }
    }

    // Determine client clinic name
    const clinicName = orders[0]?.meta?.optic_name || '—';

    // ── HEADER ──
    doc.setFontSize(7);
    doc.text('Приложение 26', pageW - margin, 8, { align: 'right' });
    doc.text('к приказу Министра финансов РК', pageW - margin, 12, { align: 'right' });
    doc.text('Форма З-2', pageW - margin, 16, { align: 'right' });

    doc.setFontSize(8);
    doc.text('Организация: ТОО "Medinn Vision Lab"', margin, 16);
    doc.text(`ИИН/БИН: 221140040278`, pageW - margin - 60, 16);

    doc.setFontSize(8);
    doc.text(`Номер документа: ${docNumber || '____________'}`, pageW - margin - 60, 22);
    doc.text(`Дата составления: ${dateStr}`, pageW - margin - 60, 26);

    doc.setFontSize(13);
    doc.text('НАКЛАДНАЯ НА ОТПУСК ЗАПАСОВ НА СТОРОНУ', pageW / 2, 34, { align: 'center' });

    doc.setFontSize(8);
    const infoY = 40;
    doc.text(`Организация-отправитель: ТОО "Medinn Vision Lab"`, margin, infoY);
    doc.text(`Организация-получатель: ${clinicName}`, margin, infoY + 5);
    doc.text(`Ответственный за поставку: ${responsible || '___________________'}`, margin, infoY + 10);

    // ── TABLE ──
    const head = [['№', 'Наименование, характеристика', 'Номенкл.\nномер', 'Ед.\nизм.', 'Подлежит\nотпуску', 'Отпущено', 'Цена за ед.\n(KZT)', 'Сумма с НДС\n(KZT)']];
    const body: string[][] = [];
    let totalQty = 0;
    let totalSum = 0;

    let idx = 0;
    for (const [, lens] of lensMap) {
        idx++;
        const sum = lens.price * lens.qty;
        totalQty += lens.qty;
        totalSum += sum;
        body.push([
            String(idx),
            lens.name1c,
            lens.code || '',
            'шт',
            String(lens.qty),
            String(lens.qty),
            lens.price ? lens.price.toLocaleString('ru-RU') : '—',
            sum ? sum.toLocaleString('ru-RU') : '—',
        ]);
    }

    // Total row
    body.push(['', 'Итого', '', '', String(totalQty), String(totalQty), 'х', totalSum.toLocaleString('ru-RU')]);

    autoTable(doc, {
        startY: infoY + 14,
        margin: { left: margin, right: margin },
        head,
        body,
        styles: { fontSize: 7.5, cellPadding: 2, font: 'Roboto', lineColor: [180, 180, 180], lineWidth: 0.3 },
        headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontSize: 7, fontStyle: 'normal', font: 'Roboto', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 25, halign: 'right' },
            7: { cellWidth: 28, halign: 'right' },
        },
        theme: 'grid',
    });

    // @ts-ignore
    let y = (doc as any).lastAutoTable.finalY + 8;

    // Total in words
    doc.setFontSize(8);
    doc.text(`Всего отпущено: ${totalQty} шт. на сумму ${totalSum.toLocaleString('ru-RU')} тенге`, margin, y);
    y += 8;

    // Signatures
    doc.text('Отпуск разрешил ___________________ / ___________________', margin, y);
    y += 6;
    doc.text('Главный бухгалтер ___________________ / ___________________', margin, y);
    y += 8;
    doc.text('Отпустил ___________________ / ___________________', margin, y);
    doc.text('Запасы получил ___________________ / ___________________', pageW / 2, y);
    y += 4;
    doc.setFontSize(7);
    doc.text('М.П.', margin, y + 4);

    doc.save(`З-2_Накладная_на_отпуск_${dateStr.replace(/\./g, '-')}.pdf`);
}
