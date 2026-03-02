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
    company?: string;
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

// Column letter to 0-based index
function col(letter: string): number {
    let n = 0;
    for (let i = 0; i < letter.length; i++) {
        n = n * 26 + (letter.charCodeAt(i) - 64);
    }
    return n - 1;
}

// Set cell value at Excel coordinate (e.g. "A1")
function setCell(ws: XLSX.WorkSheet, ref: string, value: any): void {
    XLSX.utils.sheet_add_aoa(ws, [[value]], { origin: ref });
}

export function generateZ2Excel(
    orders: OrderForZ2[],
    catalog: CatalogProduct[],
    docNumber?: string,
    responsible?: string
): void {
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

            let price = 0;
            let code = '';
            const matchProduct = catalog.find(p => {
                const searchIn = (p.name1c || p.name || '').toLowerCase();
                if (searchIn.includes(dk) &&
                    searchIn.includes(char === 'toric' ? 'тор' : 'сфер')) return true;
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

    // ── Create worksheet with exact reference layout ──
    const ws: XLSX.WorkSheet = {};
    ws['!ref'] = 'A1:AW50';

    // Legal header (top right)
    setCell(ws, 'AN1', 'Приложение 26');
    setCell(ws, 'AN2', 'к приказу Министра финансов');
    setCell(ws, 'AN3', 'Республики Казахстан');
    setCell(ws, 'AN4', 'от 20 декабря 2012 года № 562');
    setCell(ws, 'AW6', 'Форма З-2');

    // Organization info (row 9)
    setCell(ws, 'A9', 'Организация (индивидуальный предприниматель)');
    setCell(ws, 'N9', 'ТОО "Medinn Vision Lab"');
    setCell(ws, 'AN9', 'ИИН/БИН');
    setCell(ws, 'AQ9', '221140040278');

    // Document number/date (rows 12-13)
    setCell(ws, 'AP12', 'Номер документа');
    setCell(ws, 'AT12', 'Дата составления');
    setCell(ws, 'AP13', docNumber || '____________');
    setCell(ws, 'AT13', dateStr);

    // Title (row 15)
    setCell(ws, 'A15', 'НАКЛАДНАЯ НА ОТПУСК ЗАПАСОВ НА СТОРОНУ');

    // Parties (rows 18-19)
    setCell(ws, 'A18', 'Организация (индивидуальный предприниматель) - отправитель');
    setCell(ws, 'L18', 'Организация (индивидуальный предприниматель) - получатель');
    setCell(ws, 'W18', 'Ответственный за поставку (Ф.И.О.)');
    setCell(ws, 'AF18', 'Транспортная организация');
    setCell(ws, 'AO18', 'Товарно-транспортная накладная (номер, дата)');

    setCell(ws, 'A19', 'ТОО "Medinn Vision Lab"');
    setCell(ws, 'L19', clinicName);
    setCell(ws, 'W19', responsible || 'Алиева Д.Ш.');

    // Table header (rows 21-23)
    setCell(ws, 'A21', 'Номер по порядку');
    setCell(ws, 'C21', 'Наименование, характеристика');
    setCell(ws, 'O21', 'Номенкла-\nтурный номер');
    setCell(ws, 'T21', 'Единица измерения');
    setCell(ws, 'W21', 'Количество');
    setCell(ws, 'AF21', 'Цена за единицу, в KZT');
    setCell(ws, 'AL21', 'Сумма с НДС, в KZT');
    setCell(ws, 'AR21', 'Сумма НДС, в KZT');

    setCell(ws, 'W22', 'подлежит отпуску');
    setCell(ws, 'AB22', 'отпущено');

    // Column numbers (row 23)
    setCell(ws, 'A23', '1');
    setCell(ws, 'C23', '2');
    setCell(ws, 'O23', '3');
    setCell(ws, 'T23', '4');
    setCell(ws, 'W23', '5');
    setCell(ws, 'AB23', '6');
    setCell(ws, 'AF23', '7');
    setCell(ws, 'AL23', '8');
    setCell(ws, 'AR23', '9');

    // ── Data rows starting at row 24 ──
    let totalQty = 0;
    let totalSum = 0;
    let rowIdx = 24;
    let itemNum = 0;

    for (const [, lens] of lensMap) {
        itemNum++;
        const sum = lens.price * lens.qty;
        totalQty += lens.qty;
        totalSum += sum;

        const r = rowIdx;
        setCell(ws, `A${r}`, String(itemNum));
        setCell(ws, `C${r}`, lens.name1c);
        setCell(ws, `O${r}`, lens.code || '');
        setCell(ws, `T${r}`, 'шт');
        setCell(ws, `W${r}`, lens.qty);
        setCell(ws, `AB${r}`, lens.qty);
        setCell(ws, `AF${r}`, lens.price || '');
        setCell(ws, `AL${r}`, sum || '');

        rowIdx++;
    }

    // Total row
    const totR = rowIdx;
    setCell(ws, `V${totR}`, 'Итого');
    setCell(ws, `W${totR}`, totalQty);
    setCell(ws, `AB${totR}`, totalQty);
    setCell(ws, `AF${totR}`, 'х');
    setCell(ws, `AL${totR}`, totalSum);
    rowIdx += 2;

    // Summary row
    setCell(ws, `A${rowIdx}`, 'Всего отпущено количество запасов (прописью)');
    setCell(ws, `N${rowIdx}`, `${totalQty}`);
    setCell(ws, `W${rowIdx}`, ' на сумму (прописью), в KZT');
    setCell(ws, `AE${rowIdx}`, `${totalSum.toLocaleString('ru-RU')} тенге 00 тиын`);
    rowIdx++;

    // Director
    setCell(ws, `F${rowIdx}`, 'Директор');
    rowIdx++;

    // Signatures
    setCell(ws, `A${rowIdx}`, 'Отпуск разрешил');
    setCell(ws, `K${rowIdx}`, '/');
    setCell(ws, `Q${rowIdx}`, '/');
    setCell(ws, `R${rowIdx}`, responsible || 'Алиева Д.Ш.');
    setCell(ws, `AA${rowIdx}`, 'По доверенности');
    setCell(ws, `AF${rowIdx}`, '№_____________ от "____"_____________________ 20___ года');
    rowIdx++;

    setCell(ws, `F${rowIdx}`, 'должность');
    setCell(ws, `L${rowIdx}`, 'подпись');
    setCell(ws, `R${rowIdx}`, 'расшифровка подписи');
    rowIdx++;

    setCell(ws, `AA${rowIdx}`, 'выданной');
    rowIdx += 2;

    setCell(ws, `A${rowIdx}`, 'Главный бухгалтер');
    setCell(ws, `K${rowIdx}`, '/');
    setCell(ws, `L${rowIdx}`, 'Не предусмотрен');
    rowIdx++;

    setCell(ws, `F${rowIdx}`, 'подпись');
    setCell(ws, `L${rowIdx}`, 'расшифровка подписи');
    rowIdx++;

    setCell(ws, `A${rowIdx}`, 'М.П.');
    rowIdx += 2;

    setCell(ws, `A${rowIdx}`, 'Отпустил');
    setCell(ws, `K${rowIdx}`, '/');
    setCell(ws, `AA${rowIdx}`, 'Запасы получил');
    setCell(ws, `AL${rowIdx}`, '/');
    rowIdx++;

    setCell(ws, `F${rowIdx}`, 'подпись');
    setCell(ws, `L${rowIdx}`, 'расшифровка подписи');
    setCell(ws, `AF${rowIdx}`, 'подпись');
    setCell(ws, `AM${rowIdx}`, 'расшифровка подписи');

    // Update range
    ws['!ref'] = `A1:AW${rowIdx}`;

    // Column widths matching reference
    ws['!cols'] = [];
    const defaultWidth = 3.5;
    for (let i = 0; i < 49; i++) ws['!cols'].push({ wch: defaultWidth });
    // Slightly wider columns
    ws['!cols'][0] = { wch: 5 };   // A
    ws['!cols'][28] = { wch: 5 };  // AC

    // Merged cells matching reference structure
    ws['!merges'] = [
        // Header merges
        { s: { r: 0, c: col('AN') }, e: { r: 0, c: col('AW') } },  // AN1:AW1
        { s: { r: 1, c: col('AN') }, e: { r: 1, c: col('AW') } },  // AN2:AW2
        { s: { r: 2, c: col('AN') }, e: { r: 2, c: col('AW') } },  // AN3:AW3
        { s: { r: 3, c: col('AN') }, e: { r: 3, c: col('AW') } },  // AN4:AW4
        // Org info
        { s: { r: 8, c: col('A') }, e: { r: 8, c: col('M') } },    // A9:M9
        { s: { r: 8, c: col('N') }, e: { r: 8, c: col('AJ') } },   // N9:AJ9
        { s: { r: 8, c: col('AQ') }, e: { r: 8, c: col('AW') } },  // AQ9:AW9
        // Doc number
        { s: { r: 11, c: col('AP') }, e: { r: 11, c: col('AS') } }, // AP12:AS12
        { s: { r: 11, c: col('AT') }, e: { r: 11, c: col('AW') } }, // AT12:AW12
        { s: { r: 12, c: col('AP') }, e: { r: 12, c: col('AS') } }, // AP13:AS13
        { s: { r: 12, c: col('AT') }, e: { r: 12, c: col('AW') } }, // AT13:AW13
        // Title
        { s: { r: 14, c: col('A') }, e: { r: 14, c: col('AW') } },  // A15:AW15
        // Parties
        { s: { r: 17, c: col('A') }, e: { r: 17, c: col('K') } },   // A18:K18
        { s: { r: 17, c: col('L') }, e: { r: 17, c: col('V') } },   // L18:V18
        { s: { r: 17, c: col('W') }, e: { r: 17, c: col('AE') } },  // W18:AE18
        { s: { r: 17, c: col('AF') }, e: { r: 17, c: col('AN') } }, // AF18:AN18
        { s: { r: 17, c: col('AO') }, e: { r: 17, c: col('AW') } }, // AO18:AW18
        { s: { r: 18, c: col('A') }, e: { r: 18, c: col('K') } },   // A19:K19
        { s: { r: 18, c: col('L') }, e: { r: 18, c: col('V') } },   // L19:V19
        { s: { r: 18, c: col('W') }, e: { r: 18, c: col('AE') } },  // W19:AE19
        // Table header merges
        { s: { r: 20, c: col('A') }, e: { r: 21, c: col('B') } },   // A21:B22
        { s: { r: 20, c: col('C') }, e: { r: 21, c: col('N') } },   // C21:N22
        { s: { r: 20, c: col('O') }, e: { r: 21, c: col('S') } },   // O21:S22
        { s: { r: 20, c: col('T') }, e: { r: 21, c: col('V') } },   // T21:V22
        { s: { r: 20, c: col('W') }, e: { r: 20, c: col('AE') } },  // W21:AE21
        { s: { r: 20, c: col('AF') }, e: { r: 21, c: col('AK') } }, // AF21:AK22
        { s: { r: 20, c: col('AL') }, e: { r: 21, c: col('AQ') } }, // AL21:AQ22
        { s: { r: 20, c: col('AR') }, e: { r: 21, c: col('AW') } }, // AR21:AW22
        { s: { r: 21, c: col('W') }, e: { r: 21, c: col('AA') } },  // W22:AA22
        { s: { r: 21, c: col('AB') }, e: { r: 21, c: col('AE') } }, // AB22:AE22
        // Column number row
        { s: { r: 22, c: col('A') }, e: { r: 22, c: col('B') } },
        { s: { r: 22, c: col('C') }, e: { r: 22, c: col('N') } },
        { s: { r: 22, c: col('O') }, e: { r: 22, c: col('S') } },
        { s: { r: 22, c: col('T') }, e: { r: 22, c: col('V') } },
        { s: { r: 22, c: col('W') }, e: { r: 22, c: col('AA') } },
        { s: { r: 22, c: col('AB') }, e: { r: 22, c: col('AE') } },
        { s: { r: 22, c: col('AF') }, e: { r: 22, c: col('AK') } },
        { s: { r: 22, c: col('AL') }, e: { r: 22, c: col('AQ') } },
        { s: { r: 22, c: col('AR') }, e: { r: 22, c: col('AW') } },
    ];

    // Add merges for data rows
    for (let r = 23; r < 23 + lensMap.size; r++) {
        ws['!merges'].push(
            { s: { r, c: col('A') }, e: { r, c: col('B') } },
            { s: { r, c: col('C') }, e: { r, c: col('N') } },
            { s: { r, c: col('O') }, e: { r, c: col('S') } },
            { s: { r, c: col('T') }, e: { r, c: col('V') } },
            { s: { r, c: col('W') }, e: { r, c: col('AA') } },
            { s: { r, c: col('AB') }, e: { r, c: col('AE') } },
            { s: { r, c: col('AF') }, e: { r, c: col('AK') } },
            { s: { r, c: col('AL') }, e: { r, c: col('AQ') } },
            { s: { r, c: col('AR') }, e: { r, c: col('AW') } },
        );
    }

    // Total row merges
    const totRowIdx = 23 + lensMap.size;
    ws['!merges'].push(
        { s: { r: totRowIdx, c: col('W') }, e: { r: totRowIdx, c: col('AA') } },
        { s: { r: totRowIdx, c: col('AB') }, e: { r: totRowIdx, c: col('AE') } },
        { s: { r: totRowIdx, c: col('AF') }, e: { r: totRowIdx, c: col('AK') } },
        { s: { r: totRowIdx, c: col('AL') }, e: { r: totRowIdx, c: col('AQ') } },
        { s: { r: totRowIdx, c: col('AR') }, e: { r: totRowIdx, c: col('AW') } },
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Лист_1');

    XLSX.writeFile(wb, `З-2_Накладная_на_отпуск_${dateStr.replace(/\./g, '-')}.xlsx`);
}
