'use client';

import ExcelJS from 'exceljs';

interface OrderForZ2 {
    order_id: string;
    config: {
        eyes: {
            od?: { qty?: number; dk?: number | string; characteristic?: string };
            os?: { qty?: number; dk?: number | string; characteristic?: string };
        };
    };
    meta: { optic_name?: string; doctor?: string };
    company?: string;
    document_name_od?: string;
    document_name_os?: string;
}

interface CatalogProduct {
    name: string;
    name1c?: string;
    code?: string;
    price: number;
}

interface LensLine {
    name1c: string;
    code: string;
    qty: number;
    price: number;
}

function getLens1CName(dk: string, char: string): string {
    const type = char === 'toric' ? 'торические' : 'сферические';
    return `Линзы контактные жесткие корригирующие OKV-RGP OK ${type}. DK ${dk}`;
}

// Thin border style
const thin: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } };
const allBorders: Partial<ExcelJS.Borders> = { top: thin, bottom: thin, left: thin, right: thin };

export async function generateZ2Excel(
    orders: OrderForZ2[],
    catalog: CatalogProduct[],
    docNumber?: string,
    responsible?: string
): Promise<void> {
    const dateStr = new Date().toLocaleDateString('ru-RU');
    const clinicName = orders[0]?.meta?.optic_name || orders[0]?.company || '—';

    // ── Aggregate lenses ──
    const lensMap = new Map<string, LensLine>();
    for (const order of orders) {
        for (const side of ['od', 'os'] as const) {
            const eye = order.config?.eyes?.[side];
            if (!eye || !Number(eye.qty)) continue;
            const qty = Number(eye.qty);
            const dk = String(eye.dk || '100');
            const char = eye.characteristic || 'spherical';
            const key = `${char}-${dk}`;
            const docName = side === 'od' ? order.document_name_od : order.document_name_os;
            const name1c = docName || getLens1CName(dk, char);

            let price = 0, code = '';
            const match = catalog.find(p => {
                const s = (p.name1c || p.name || '').toLowerCase();
                return s.includes(dk) && s.includes(char === 'toric' ? 'тор' : 'сфер');
            });
            if (match) { price = match.price || 0; code = match.code || ''; }

            const existing = lensMap.get(key);
            if (existing) { existing.qty += qty; }
            else { lensMap.set(key, { name1c, code, qty, price }); }
        }
    }

    // ── Create workbook ──
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Лист_1');

    // Column widths (49 columns A-AW) — matching reference
    const colWidths = [
        5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5,  // A-J
        2, 3.5, 3.5, 3.5, 3.5, 3.5, 2, 2, 3.5, 3.5,        // K-T
        3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 5, 3.5,    // U-AD
        3.5, 3.5, 3.5, 3.5, 3.5, 2, 3.5, 3.5, 2, 3.5,      // AE-AN
        3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5,       // AO-AW
    ];
    colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    // ── Helper: set cell value + style ──
    const setVal = (row: number, col: number, val: any, opts?: {
        bold?: boolean; fontSize?: number; align?: ExcelJS.Alignment['horizontal'];
        border?: boolean; wrap?: boolean;
    }) => {
        const cell = ws.getCell(row, col);
        cell.value = val;
        cell.font = { name: 'Calibri', size: opts?.fontSize || 10, bold: opts?.bold || false };
        if (opts?.align) cell.alignment = { horizontal: opts.align, vertical: 'middle', wrapText: opts?.wrap };
        if (opts?.wrap) cell.alignment = { ...cell.alignment, wrapText: true };
        if (opts?.border) cell.border = allBorders;
    };

    // ── Legal header (rows 1-6, right side) ──
    ws.mergeCells('AN1:AW1'); setVal(1, 40, 'Приложение 26', { fontSize: 8 });
    ws.mergeCells('AN2:AW2'); setVal(2, 40, 'к приказу Министра финансов', { fontSize: 8 });
    ws.mergeCells('AN3:AW3'); setVal(3, 40, 'Республики Казахстан', { fontSize: 8 });
    ws.mergeCells('AN4:AW4'); setVal(4, 40, 'от 20 декабря 2012 года № 562', { fontSize: 8 });
    setVal(6, 49, 'Форма З-2', { bold: true, fontSize: 9 });

    // ── Organization (row 9) ──
    ws.mergeCells('A9:M9'); setVal(9, 1, 'Организация (индивидуальный предприниматель)', { fontSize: 9 });
    ws.mergeCells('N9:AJ9'); setVal(9, 14, 'ТОО "Medinn Vision Lab"', { bold: true, fontSize: 10 });
    setVal(9, 40, 'ИИН/БИН', { fontSize: 9 });
    ws.mergeCells('AQ9:AW9'); setVal(9, 43, '221140040278', { bold: true });

    // ── Doc number/date (rows 12-13) ──
    ws.mergeCells('AP12:AS12'); setVal(12, 42, 'Номер документа', { fontSize: 9, border: true, align: 'center' });
    ws.mergeCells('AT12:AW12'); setVal(12, 46, 'Дата составления', { fontSize: 9, border: true, align: 'center' });
    ws.mergeCells('AP13:AS13'); setVal(13, 42, docNumber || '', { border: true, align: 'center' });
    ws.mergeCells('AT13:AW13'); setVal(13, 46, dateStr, { border: true, align: 'center' });

    // ── Title (row 15) ──
    ws.mergeCells('A15:AW15');
    setVal(15, 1, 'НАКЛАДНАЯ НА ОТПУСК ЗАПАСОВ НА СТОРОНУ', { bold: true, fontSize: 12, align: 'center' });

    // ── Parties header (row 18) ──
    ws.mergeCells('A18:K18'); setVal(18, 1, 'Организация (индивидуальный предприниматель) - отправитель', { fontSize: 8, border: true });
    ws.mergeCells('L18:V18'); setVal(18, 12, 'Организация (индивидуальный предприниматель) - получатель', { fontSize: 8, border: true });
    ws.mergeCells('W18:AE18'); setVal(18, 23, 'Ответственный за поставку (Ф.И.О.)', { fontSize: 8, border: true });
    ws.mergeCells('AF18:AN18'); setVal(18, 32, 'Транспортная организация', { fontSize: 8, border: true });
    ws.mergeCells('AO18:AW18'); setVal(18, 41, 'Товарно-транспортная накладная (номер, дата)', { fontSize: 8, border: true });

    // ── Parties data (row 19) ──
    ws.mergeCells('A19:K19'); setVal(19, 1, 'ТОО "Medinn Vision Lab"', { fontSize: 9, border: true });
    ws.mergeCells('L19:V19'); setVal(19, 12, clinicName, { fontSize: 9, border: true, bold: true });
    ws.mergeCells('W19:AE19'); setVal(19, 23, responsible || 'Алиева Д.Ш.', { fontSize: 9, border: true });
    ws.mergeCells('AF19:AN19'); setVal(19, 32, '', { border: true });
    ws.mergeCells('AO19:AW19'); setVal(19, 41, '', { border: true });

    // ── Table header (rows 21-23) — all bordered ──
    // Row 21 — main headers
    ws.mergeCells('A21:B22'); setVal(21, 1, 'Номер по порядку', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });
    ws.mergeCells('C21:N22'); setVal(21, 3, 'Наименование, характеристика', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });
    ws.mergeCells('O21:S22'); setVal(21, 15, 'Номенклатурный номер', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });
    ws.mergeCells('T21:V22'); setVal(21, 20, 'Единица измерения', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });
    ws.mergeCells('W21:AE21'); setVal(21, 23, 'Количество', { fontSize: 8, bold: true, border: true, align: 'center' });
    ws.mergeCells('AF21:AK22'); setVal(21, 32, 'Цена за единицу, в KZT', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });
    ws.mergeCells('AL21:AQ22'); setVal(21, 38, 'Сумма с НДС, в KZT', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });
    ws.mergeCells('AR21:AW22'); setVal(21, 44, 'Сумма НДС, в KZT', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });

    // Row 22 — sub-headers for Количество
    ws.mergeCells('W22:AA22'); setVal(22, 23, 'подлежит отпуску', { fontSize: 8, border: true, align: 'center' });
    ws.mergeCells('AB22:AE22'); setVal(22, 28, 'отпущено', { fontSize: 8, border: true, align: 'center' });

    // Row 23 — column numbers
    const colNums: [string, string, number, string][] = [
        ['A23', 'B23', 1, '1'], ['C23', 'N23', 3, '2'], ['O23', 'S23', 15, '3'],
        ['T23', 'V23', 20, '4'], ['W23', 'AA23', 23, '5'], ['AB23', 'AE23', 28, '6'],
        ['AF23', 'AK23', 32, '7'], ['AL23', 'AQ23', 38, '8'], ['AR23', 'AW23', 44, '9'],
    ];
    for (const [start, end, colIdx, num] of colNums) {
        ws.mergeCells(`${start}:${end}`);
        setVal(23, colIdx, num, { fontSize: 8, border: true, align: 'center' });
    }

    // Add borders to merged header area cells
    for (let r = 21; r <= 23; r++) {
        for (let c = 1; c <= 49; c++) {
            const cell = ws.getCell(r, c);
            if (!cell.border) cell.border = allBorders;
        }
    }

    // ── Data rows ──
    let totalQty = 0, totalSum = 0;
    let rowIdx = 24;
    let itemNum = 0;

    for (const [, lens] of lensMap) {
        itemNum++;
        const sum = lens.price * lens.qty;
        totalQty += lens.qty;
        totalSum += sum;
        const r = rowIdx;

        ws.mergeCells(`A${r}:B${r}`); setVal(r, 1, itemNum, { border: true, align: 'center' });
        ws.mergeCells(`C${r}:N${r}`); setVal(r, 3, lens.name1c, { border: true, fontSize: 9, wrap: true });
        ws.mergeCells(`O${r}:S${r}`); setVal(r, 15, lens.code || '', { border: true, align: 'center' });
        ws.mergeCells(`T${r}:V${r}`); setVal(r, 20, 'шт', { border: true, align: 'center' });
        ws.mergeCells(`W${r}:AA${r}`); setVal(r, 23, lens.qty, { border: true, align: 'center' });
        ws.mergeCells(`AB${r}:AE${r}`); setVal(r, 28, lens.qty, { border: true, align: 'center' });
        ws.mergeCells(`AF${r}:AK${r}`); setVal(r, 32, lens.price || '', { border: true, align: 'center' });
        ws.mergeCells(`AL${r}:AQ${r}`); setVal(r, 38, sum || '', { border: true, align: 'center' });
        ws.mergeCells(`AR${r}:AW${r}`); setVal(r, 44, '', { border: true });

        // Ensure all cells in data row have borders
        for (let c = 1; c <= 49; c++) {
            const cell = ws.getCell(r, c);
            if (!cell.border) cell.border = allBorders;
        }

        rowIdx++;
    }

    // ── Total row ──
    const tr = rowIdx;
    setVal(tr, 22, 'Итого', { bold: true, border: true, align: 'right' });
    ws.mergeCells(`W${tr}:AA${tr}`); setVal(tr, 23, totalQty, { bold: true, border: true, align: 'center' });
    ws.mergeCells(`AB${tr}:AE${tr}`); setVal(tr, 28, totalQty, { bold: true, border: true, align: 'center' });
    ws.mergeCells(`AF${tr}:AK${tr}`); setVal(tr, 32, 'х', { border: true, align: 'center' });
    ws.mergeCells(`AL${tr}:AQ${tr}`); setVal(tr, 38, totalSum, { bold: true, border: true, align: 'center' });
    ws.mergeCells(`AR${tr}:AW${tr}`); setVal(tr, 44, '', { border: true });
    for (let c = 1; c <= 49; c++) { const cell = ws.getCell(tr, c); if (!cell.border) cell.border = allBorders; }
    rowIdx += 2;

    // ── Summary ──
    setVal(rowIdx, 1, 'Всего отпущено количество запасов (прописью)', { fontSize: 9 });
    setVal(rowIdx, 14, `${totalQty}`, { bold: true });
    setVal(rowIdx, 23, ' на сумму (прописью), в KZT', { fontSize: 9 });
    setVal(rowIdx, 31, `${totalSum.toLocaleString('ru-RU')} тенге 00 тиын`, { bold: true });
    rowIdx++;

    setVal(rowIdx, 6, 'Директор', { fontSize: 9 });
    rowIdx++;

    // ── Signatures ──
    setVal(rowIdx, 1, 'Отпуск разрешил', { fontSize: 9 });
    setVal(rowIdx, 11, '/', { fontSize: 9 });
    setVal(rowIdx, 17, '/', { fontSize: 9 });
    setVal(rowIdx, 18, responsible || 'Алиева Д.Ш.', { fontSize: 9 });
    setVal(rowIdx, 27, 'По доверенности', { fontSize: 9 });
    setVal(rowIdx, 32, '№_____________ от "____"_____________________ 20___ года', { fontSize: 8 });
    rowIdx++;

    setVal(rowIdx, 6, 'должность', { fontSize: 8 });
    setVal(rowIdx, 12, 'подпись', { fontSize: 8 });
    setVal(rowIdx, 18, 'расшифровка подписи', { fontSize: 8 });
    rowIdx++;

    setVal(rowIdx, 27, 'выданной', { fontSize: 8 });
    rowIdx += 2;

    setVal(rowIdx, 1, 'Главный бухгалтер', { fontSize: 9 });
    setVal(rowIdx, 11, '/', { fontSize: 9 });
    setVal(rowIdx, 12, 'Не предусмотрен', { fontSize: 9 });
    rowIdx++;

    setVal(rowIdx, 6, 'подпись', { fontSize: 8 });
    setVal(rowIdx, 12, 'расшифровка подписи', { fontSize: 8 });
    rowIdx++;

    setVal(rowIdx, 1, 'М.П.', { fontSize: 9 });
    rowIdx += 2;

    setVal(rowIdx, 1, 'Отпустил', { fontSize: 9 });
    setVal(rowIdx, 11, '/', { fontSize: 9 });
    setVal(rowIdx, 27, 'Запасы получил', { fontSize: 9 });
    setVal(rowIdx, 38, '/', { fontSize: 9 });
    rowIdx++;

    setVal(rowIdx, 6, 'подпись', { fontSize: 8 });
    setVal(rowIdx, 12, 'расшифровка подписи', { fontSize: 8 });
    setVal(rowIdx, 32, 'подпись', { fontSize: 8 });
    setVal(rowIdx, 39, 'расшифровка подписи', { fontSize: 8 });

    // ── Row heights ──
    ws.getRow(15).height = 22;
    ws.getRow(21).height = 30;
    ws.getRow(22).height = 18;

    // ── Save ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `З-2_Накладная_на_отпуск_${dateStr.replace(/\./g, '-')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}
