'use client';

import * as XLSX from 'xlsx';

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
    material: string;
    doc_name: string;
    qty: number;
}

export function generateM11Excel(orders: OrderForM11[], docNumber?: string): void {
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
            if (existing) {
                existing.qty += qty;
            } else {
                blankMap.set(key, { material, doc_name: docName, qty });
            }
            totalBlanks += qty;
        }
    }

    // Build worksheet data
    const data: any[][] = [];

    // Header rows
    data.push(['', 'ТРЕБОВАНИЕ-НАКЛАДНАЯ №', docNumber || '', '', '', '', '', '', '', '', '', '', '', 'Коды']);
    data.push(['', 'ТОО "Medinn Vision Lab"', '', '', '', '', '', '', '', '', '', 'ОКПО', '']);
    data.push([]);
    data.push([
        '', 'Дата составления', 'Код вида операции',
        'Отправитель', '', '', '', 'Получатель', '', '', '',
        'Корреспондирующий счет', '', 'Учетная единица'
    ]);
    data.push([
        '', '', '',
        'структурное подразделение', '', 'вид деятельности', '',
        'структурное подразделение', '', 'вид деятельности', '',
        'счет, субсчет', 'код аналит. учета', ''
    ]);
    data.push([
        '', dateStr, '',
        'Основной склад', '', '', '',
        'Основное подразделение', '', '', '',
        '8110', '', ''
    ]);
    data.push([]);
    data.push(['', 'Через кого __________________________________________________________']);
    data.push(['', 'Затребовал ______________________________', '', '', '', '', '', 'Разрешил ______________________________']);
    data.push([]);

    // Table header
    data.push([
        'Корреспондирующий счет', '', '',
        'Материальные ценности', '', '', '',
        'Единица измерения', '',
        'Количество', '',
        'Цена', 'Сумма без учета НДС',
        'Порядковый номер'
    ]);
    data.push([
        'счет, субсчет', 'код аналит. учета', '',
        'наименование', '', '', 'номенкл. номер',
        'код', 'наименование',
        'затребовано', 'отпущено',
        '', '', ''
    ]);
    data.push(['1', '2', '', '3', '', '', '4', '5', '6', '7', '8', '9', '10', '11']);

    // Blank rows
    for (const [, entry] of blankMap) {
        data.push([
            '1310', '', '',
            entry.material, '', '', entry.doc_name,
            '796', 'шт',
            entry.qty, 'ШТ',
            '', '', ''
        ]);
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
        data.push(['1310', '', '', c.name, '', '', '', '796', c.unit, c.qty, '', '', '', '']);
    }

    // Defect rows (same blanks + "(БРАК)")
    for (const [, entry] of blankMap) {
        data.push(['1310', '', '', `${entry.material} (БРАК)`, '', '', entry.doc_name, '796', 'шт', '', '', '', '', '']);
    }

    // Signatures
    data.push([]);
    data.push(['', 'Через кого ____________________________________________________________']);
    data.push(['', 'Затребовал ________________________', '', '', '', '', '', 'Разрешил ________________________']);
    data.push(['', 'Отпустил ________________________', '', '', '', '', '', 'Получил ________________________']);

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = [
        { wch: 12 }, // A - счет
        { wch: 14 }, // B
        { wch: 6 },  // C
        { wch: 45 }, // D - наименование
        { wch: 4 },  // E
        { wch: 8 },  // F
        { wch: 55 }, // G - наименование 1С
        { wch: 6 },  // H - код
        { wch: 8 },  // I - ед.
        { wch: 12 }, // J - затребовано
        { wch: 10 }, // K - отпущено
        { wch: 10 }, // L - цена
        { wch: 14 }, // M - сумма
        { wch: 12 }, // N - порядковый
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'М-11');

    XLSX.writeFile(wb, `М-11_Требование_накладная_${dateStr.replace(/\./g, '-')}.xlsx`);
}
