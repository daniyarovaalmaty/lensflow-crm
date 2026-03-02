'use client';

import * as XLSX from 'xlsx';

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

function getLens1CName(dk: string, char: string): string {
    const type = char === 'toric' ? 'торические' : 'сферические';
    return `Линзы контактные жесткие корригирующие OKV-RGP OK ${type}. DK ${dk}`;
}

interface LensLine {
    name1c: string;
    code: string;
    qty: number;
    price: number;
}

export function generateZ2Excel(
    orders: OrderForZ2[],
    catalog: CatalogProduct[],
    docNumber?: string,
    responsible?: string
): void {
    const dateStr = new Date().toLocaleDateString('ru-RU');
    const clinicName = orders[0]?.meta?.optic_name || '—';

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

            let price = 0;
            let code = '';
            const matchProduct = catalog.find(p => {
                if (p.name1c && p.name1c.toLowerCase().includes(dk) &&
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

    // Build worksheet data
    const data: any[][] = [];

    // Legal header (top right)
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Приложение 26']);
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'к приказу Министра финансов']);
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Республики Казахстан']);
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'от 20 декабря 2012 года № 562']);
    data.push([]);
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Форма З-2']);
    data.push([]);

    // Organization info
    data.push(['Организация (индивидуальный предприниматель)', '', '', '', '', '', '', '', '', '', '', '', '', 'ТОО "Medinn Vision Lab"', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'ИИН/БИН', '', '', '221140040278']);
    data.push([]);

    // Document number and date
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Номер документа', '', '', '', 'Дата составления']);
    data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', docNumber || '____________', '', '', '', dateStr]);
    data.push([]);

    // Title
    data.push(['НАКЛАДНАЯ НА ОТПУСК ЗАПАСОВ НА СТОРОНУ']);
    data.push([]);

    // Parties info  
    data.push(['Организация-отправитель', '', '', '', '', '', '', '', '', '', '', 'Организация-получатель', '', '', '', '', '', '', '', '', '', '', 'Ответственный за поставку', '', '', '', '', '', '', '', '', 'Транспортная организация']);
    data.push(['ТОО "Medinn Vision Lab"', '', '', '', '', '', '', '', '', '', '', clinicName, '', '', '', '', '', '', '', '', '', '', responsible || 'Алиева Д.Ш.']);
    data.push([]);

    // Table header
    const headerRow = data.length;
    data.push([
        'Номер по порядку', '',
        'Наименование, характеристика', '', '', '', '', '', '', '', '', '', '', '',
        'Номенклатурный номер', '', '', '', '',
        'Единица измерения', '', '',
        'Количество', '', '', '', '',
        'Цена за единицу, в KZT', '', '', '', '', '',
        'Сумма с НДС, в KZT', '', '', '', '', '',
        'Сумма НДС, в KZT'
    ]);
    data.push([
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        'подлежит отпуску', '', '', '', 'отпущено',
    ]);
    data.push(['1', '', '2', '', '', '', '', '', '', '', '', '', '', '', '3', '', '', '', '', '4', '', '', '5', '', '', '', '6', '7', '', '', '', '', '', '8', '', '', '', '', '', '9']);

    // Data rows
    let totalQty = 0;
    let totalSum = 0;
    let idx = 0;

    for (const [, lens] of lensMap) {
        idx++;
        const sum = lens.price * lens.qty;
        totalQty += lens.qty;
        totalSum += sum;
        data.push([
            idx, '',
            lens.name1c, '', '', '', '', '', '', '', '', '', '', '',
            lens.code || '', '', '', '', '',
            'шт', '', '',
            lens.qty, '', '', '', lens.qty,
            lens.price || '', '', '', '', '', '',
            sum || '', '', '', '', '', '',
            ''
        ]);
    }

    // Total
    data.push([
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Итого',
        totalQty, '', '', '', totalQty,
        'х', '', '', '', '', '',
        totalSum, '', '', '', '', '',
        ''
    ]);

    data.push([]);
    data.push([`Всего отпущено количество запасов: ${totalQty} шт.`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'на сумму: ', '', '', '', '', '', `${totalSum.toLocaleString('ru-RU')} тенге`]);

    data.push([]);
    data.push(['Отпуск разрешил', '', '', '', '', '', '', '', '', '', '/', '', '', '', '', '', '', '/', '', '', '', '', '', '', '', '', '', '', 'По доверенности']);
    data.push(['', '', '', '', '', 'должность', '', '', '', '', '', 'подпись', '', '', '', '', '', '', 'расшифровка подписи']);
    data.push([]);
    data.push(['Главный бухгалтер', '', '', '', '', '', '', '', '', '', '/', '', '', '', '', '', '', 'Не предусмотрен']);
    data.push([]);
    data.push(['М.П.']);
    data.push([]);
    data.push(['Отпустил', '', '', '', '', '', '', '', '', '', '/', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Запасы получил', '', '', '', '', '', '', '', '', '', '', '', '', '', '/']);
    data.push(['', '', '', '', '', 'подпись', '', '', '', '', '', 'расшифровка подписи', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'подпись', '', '', '', '', '', '', '', 'расшифровка подписи']);

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths - set first few wider
    ws['!cols'] = [
        { wch: 8 }, { wch: 4 },   // A-B
        { wch: 10 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, // C-N naim
        { wch: 10 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 },  // O-S nom
        { wch: 5 }, { wch: 3 }, { wch: 3 },  // T-V ed
        { wch: 10 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 10 }, // W-AA qty
        { wch: 12 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, // AB-AG price
        { wch: 12 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 }, // AH-AM summa
        { wch: 12 }, // AN nds
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'З-2');

    XLSX.writeFile(wb, `З-2_Накладная_на_отпуск_${dateStr.replace(/\./g, '-')}.xlsx`);
}
