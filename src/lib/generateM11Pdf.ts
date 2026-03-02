'use client';

import ExcelJS from 'exceljs';

const DK_BRAND: Record<string, string> = {
    '50': 'Contraperm F2Mid',
    '100': 'Optimum extra',
    '125': 'Optimum extreme',
    '180': 'Optimum infinite',
};

const COLOR_MAP: Record<string, string> = {
    'Синий': 'blue', 'Зелёный': 'green', 'Фиолетовый': 'violet', 'Красный': 'red',
    'Голубой': 'blue', 'Салатовый': 'green', 'Тёмно-синий': 'dark blue', 'Тёмно-зелёный': 'green',
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
}

interface BlankEntry { material: string; doc_name: string; qty: number; }

const thin: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } };
const allBorders: Partial<ExcelJS.Borders> = { top: thin, bottom: thin, left: thin, right: thin };

export async function generateM11Excel(orders: OrderForM11[], docNumber?: string): Promise<void> {
    const dateStr = new Date().toLocaleDateString('ru-RU');

    // ── Aggregate blanks ──
    const blankMap = new Map<string, BlankEntry>();
    let totalBlanks = 0;

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
            if (existing) { existing.qty += qty; }
            else { blankMap.set(key, { material, doc_name: docName, qty }); }
            totalBlanks += qty;
        }
    }

    // ── Create workbook ──
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('М-11');

    // Column widths matching reference (14 columns)
    const colWidths = [4, 12, 6, 40, 4, 4, 50, 6, 8, 12, 10, 10, 14, 12];
    colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    // ── Helper ──
    const setVal = (row: number, col: number, val: any, opts?: {
        bold?: boolean; fontSize?: number; align?: ExcelJS.Alignment['horizontal'];
        border?: boolean; wrap?: boolean; valign?: ExcelJS.Alignment['vertical'];
    }) => {
        const cell = ws.getCell(row, col);
        cell.value = val;
        cell.font = { name: 'Calibri', size: opts?.fontSize || 10, bold: opts?.bold || false };
        cell.alignment = {
            horizontal: opts?.align || 'left',
            vertical: opts?.valign || 'middle',
            wrapText: opts?.wrap || false,
        };
        if (opts?.border) cell.border = allBorders;
    };

    const borderRow = (r: number, startCol: number, endCol: number) => {
        for (let c = startCol; c <= endCol; c++) {
            const cell = ws.getCell(r, c);
            if (!cell.border) cell.border = allBorders;
        }
    };

    // ── ROW 1: Title ──
    ws.mergeCells('B1:L1');
    setVal(1, 2, `ТРЕБОВАНИЕ-НАКЛАДНАЯ № ${docNumber || '______'}`, { bold: true, fontSize: 12, align: 'center' });
    setVal(1, 14, 'Коды', { fontSize: 8, border: true, align: 'center' });

    // ── ROW 2: Organization ──
    ws.mergeCells('B2:K2');
    setVal(2, 2, 'ТОО "Medinn Vision Lab"', { fontSize: 10 });
    setVal(2, 12, 'ОКПО', { fontSize: 8, border: true, align: 'center' });
    setVal(2, 13, '', { border: true });

    // ── ROW 4-6: Structure ──
    // Row 4 header
    setVal(4, 2, 'Дата\nсоставления', { fontSize: 8, border: true, align: 'center', wrap: true });
    setVal(4, 3, 'Код вида\nоперации', { fontSize: 8, border: true, align: 'center', wrap: true });
    ws.mergeCells('D4:F4');
    setVal(4, 4, 'Отправитель', { fontSize: 8, bold: true, border: true, align: 'center' });
    ws.mergeCells('H4:J4');
    setVal(4, 8, 'Получатель', { fontSize: 8, bold: true, border: true, align: 'center' });
    ws.mergeCells('L4:M4');
    setVal(4, 12, 'Корреспондирующий\nсчет', { fontSize: 8, border: true, align: 'center', wrap: true });
    setVal(4, 14, 'Учетная единица', { fontSize: 7, border: true, align: 'center', wrap: true });

    // Row 5 sub-header
    setVal(5, 4, 'структурное\nподразделение', { fontSize: 7, border: true, align: 'center', wrap: true });
    setVal(5, 6, 'вид\nдеятельности', { fontSize: 7, border: true, align: 'center', wrap: true });
    setVal(5, 8, 'структурное\nподразделение', { fontSize: 7, border: true, align: 'center', wrap: true });
    setVal(5, 10, 'вид\nдеятельности', { fontSize: 7, border: true, align: 'center', wrap: true });
    setVal(5, 12, 'счет, субсчет', { fontSize: 7, border: true, align: 'center' });
    setVal(5, 13, 'код аналит.\nучета', { fontSize: 7, border: true, align: 'center', wrap: true });
    borderRow(5, 2, 14);

    // Row 6 data
    setVal(6, 2, dateStr, { border: true, align: 'center' });
    setVal(6, 3, '', { border: true });
    setVal(6, 4, 'Основной склад', { border: true });
    setVal(6, 6, '', { border: true });
    setVal(6, 8, 'Основное подразделение', { border: true });
    setVal(6, 10, '', { border: true });
    setVal(6, 12, '8110', { border: true, align: 'center' });
    setVal(6, 13, '', { border: true });
    setVal(6, 14, '', { border: true });
    borderRow(6, 2, 14);

    // Row 8-9 signatures
    ws.mergeCells('B8:N8');
    setVal(8, 2, 'Через кого ________________________________________________________________________________________', { fontSize: 9 });
    setVal(9, 2, 'Затребовал ___________________________________', { fontSize: 9 });
    setVal(9, 8, 'Разрешил ___________________________________________', { fontSize: 9 });

    // ── ROW 11-12: Table header ──
    // Row 11 - main header
    ws.mergeCells('B11:C11');
    setVal(11, 2, 'Корреспондирующий\nсчет', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });
    ws.mergeCells('D11:G11');
    setVal(11, 4, 'Материальные ценности', { fontSize: 8, bold: true, border: true, align: 'center' });
    ws.mergeCells('H11:I11');
    setVal(11, 8, 'Единица\nизмерения', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });
    ws.mergeCells('J11:K11');
    setVal(11, 10, 'Количество', { fontSize: 8, bold: true, border: true, align: 'center' });
    setVal(11, 12, 'Цена', { fontSize: 8, bold: true, border: true, align: 'center' });
    setVal(11, 13, 'Сумма без\nучета НДС', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });
    setVal(11, 14, 'Порядковый\nномер', { fontSize: 8, bold: true, border: true, align: 'center', wrap: true });
    borderRow(11, 2, 14);

    // Row 12 - sub headers
    setVal(12, 2, 'счет, субсчет', { fontSize: 7, border: true, align: 'center' });
    setVal(12, 3, 'код аналит.\nучета', { fontSize: 7, border: true, align: 'center', wrap: true });
    setVal(12, 4, 'наименование', { fontSize: 7, border: true, align: 'center' });
    setVal(12, 7, 'номенкл.\nномер', { fontSize: 7, border: true, align: 'center', wrap: true });
    setVal(12, 8, 'код', { fontSize: 7, border: true, align: 'center' });
    setVal(12, 9, 'наименование', { fontSize: 7, border: true, align: 'center' });
    setVal(12, 10, 'затребовано', { fontSize: 7, border: true, align: 'center' });
    setVal(12, 11, 'отпущено', { fontSize: 7, border: true, align: 'center' });
    borderRow(12, 2, 14);

    // Row 13 - column numbers
    const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    [2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14].forEach((c, i) => {
        setVal(13, c, nums[i], { fontSize: 8, border: true, align: 'center' });
    });
    borderRow(13, 2, 14);

    // ── DATA ROWS ──
    let row = 14;

    // Blanks
    for (const [, entry] of blankMap) {
        setVal(row, 2, '1310', { border: true, align: 'center' });
        setVal(row, 3, '', { border: true });
        setVal(row, 4, entry.material, { border: true, wrap: true, fontSize: 9 });
        setVal(row, 7, entry.doc_name, { border: true, wrap: true, fontSize: 8 });
        setVal(row, 8, '796', { border: true, align: 'center' });
        setVal(row, 9, 'шт', { border: true, align: 'center' });
        setVal(row, 10, entry.qty, { border: true, align: 'center' });
        setVal(row, 11, 'ШТ', { border: true, align: 'center' });
        setVal(row, 12, '', { border: true });
        setVal(row, 13, '', { border: true });
        setVal(row, 14, '', { border: true });
        borderRow(row, 2, 14);
        row++;
    }

    // Consumables
    const consumables = [
        { name: 'блистер двойной (1 линза)', qty: totalBlanks, unit: 'шт' },
        { name: 'блистер односторонний (1 линза для диагност. набора)', qty: 0, unit: 'шт' },
        { name: 'бочонки для набора (126)', qty: 0, unit: 'шт' },
        { name: 'этикетка с рулона (1 линза)', qty: totalBlanks, unit: 'шт' },
        { name: 'этикетка/наклейка для набора', qty: 0, unit: 'шт' },
        { name: 'воск', qty: Math.round(totalBlanks * 0.05 * 100) / 100, unit: 'МЛГ' },
        { name: 'контропол', qty: Math.round(totalBlanks * 0.05 * 100) / 100, unit: 'МЛГ' },
        { name: 'Коробка большая (126)', qty: 0, unit: 'шт' },
        { name: 'Коробка маленькая (14шт)', qty: 0, unit: 'шт' },
        { name: 'Коробка маленькая (28шт)', qty: 0, unit: 'шт' },
    ];
    for (const c of consumables) {
        setVal(row, 2, '1310', { border: true, align: 'center' });
        setVal(row, 3, '', { border: true });
        setVal(row, 4, c.name, { border: true, wrap: true, fontSize: 9 });
        setVal(row, 7, '', { border: true });
        setVal(row, 8, '796', { border: true, align: 'center' });
        setVal(row, 9, c.unit, { border: true, align: 'center' });
        setVal(row, 10, c.qty, { border: true, align: 'center' });
        setVal(row, 11, '', { border: true });
        setVal(row, 12, '', { border: true });
        setVal(row, 13, '', { border: true });
        setVal(row, 14, '', { border: true });
        borderRow(row, 2, 14);
        row++;
    }

    // Defect rows
    for (const [, entry] of blankMap) {
        setVal(row, 2, '1310', { border: true, align: 'center' });
        setVal(row, 3, '', { border: true });
        setVal(row, 4, `${entry.material} (БРАК)`, { border: true, wrap: true, fontSize: 9 });
        setVal(row, 7, entry.doc_name, { border: true, wrap: true, fontSize: 8 });
        setVal(row, 8, '796', { border: true, align: 'center' });
        setVal(row, 9, 'шт', { border: true, align: 'center' });
        setVal(row, 10, '', { border: true, align: 'center' });
        setVal(row, 11, '', { border: true });
        setVal(row, 12, '', { border: true });
        setVal(row, 13, '', { border: true });
        setVal(row, 14, '', { border: true });
        borderRow(row, 2, 14);
        row++;
    }

    // ── Signatures ──
    row += 1;
    ws.mergeCells(`B${row}:N${row}`);
    setVal(row, 2, 'Через кого ____________________________________________________________', { fontSize: 9 });
    row++;
    setVal(row, 2, 'Затребовал ________________________', { fontSize: 9 });
    setVal(row, 8, 'Разрешил ________________________', { fontSize: 9 });
    row++;
    setVal(row, 2, 'Отпустил ________________________', { fontSize: 9 });
    setVal(row, 8, 'Получил ________________________', { fontSize: 9 });

    // Row heights
    ws.getRow(1).height = 20;
    ws.getRow(4).height = 25;
    ws.getRow(5).height = 22;
    ws.getRow(11).height = 25;
    ws.getRow(12).height = 20;

    // ── Save ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `М-11_Требование_накладная_${dateStr.replace(/\./g, '-')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}
