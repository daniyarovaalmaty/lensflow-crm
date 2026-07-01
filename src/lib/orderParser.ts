export interface ParsedTableData {
    company?: string;
    patientName?: string;
    qty?: number;
    notes?: string;
    od?: {
        characteristic?: 'toric' | 'spherical';
        km?: number;
        tp?: number;
        dia?: number;
        tor?: number;
        e1?: number;
        e2?: number;
        color?: string;
        dk?: string;
        compression_factor?: number;
        qty?: number;
        myorthok?: boolean;
    };
    os?: {
        characteristic?: 'toric' | 'spherical';
        km?: number;
        tp?: number;
        dia?: number;
        tor?: number;
        e1?: number;
        e2?: number;
        color?: string;
        dk?: string;
        compression_factor?: number;
        qty?: number;
        myorthok?: boolean;
    };
}

function parseEyeString(eyeStr: string, isToric: boolean): ParsedTableData['od'] {
    if (!eyeStr) return undefined;
    
    // Remove quotes and newlines, normalize Cyrillic 'О' to Latin 'O' for OD/OS and 'ОВ' to 'OD'
    eyeStr = eyeStr.replace(/["\n]/g, ' ').replace(/[Оо][Вв]/ig, 'OD').replace(/[Оо]D/ig, 'OD').replace(/[Оо]S/ig, 'OS').trim();
    
    const eye: ParsedTableData['od'] = {
        characteristic: isToric ? 'toric' : 'spherical',
        dk: '100' // Default DK 100 as requested
    };

    if (/dk\s*125/i.test(eyeStr)) eye.dk = '125';
    else if (/dk\s*50/i.test(eyeStr)) eye.dk = '50';
    else if (/dk\s*180/i.test(eyeStr)) eye.dk = '180';

    const parts = eyeStr.split(/\s+/);
    
    parts.forEach(part => {
        if (part === 'OD' || part === 'OS') return;
        
        // E1/E2
        if (part.includes('/')) {
            const [e1, e2] = part.split('/');
            const numE1 = parseFloat(e1.replace(',', '.'));
            const numE2 = parseFloat(e2.replace(',', '.'));
            if (!isNaN(numE1)) eye.e1 = numE1;
            if (!isNaN(numE2)) eye.e2 = numE2;
        }
        // DIA
        else if ((part.startsWith('D') || part.startsWith('d')) && !isNaN(parseFloat(part.substring(1).replace(',', '.')))) {
            eye.dia = parseFloat(part.substring(1).replace(',', '.'));
        }
        // Tor
        else if ((part.startsWith('t') || part.startsWith('T')) && !isNaN(parseFloat(part.substring(1).replace(',', '.')))) {
            eye.tor = parseFloat(part.substring(1).replace(',', '.'));
        }
        else if (part.toLowerCase().startsWith('fac')) {
            const num = part.substring(3);
            if (num) {
                eye.compression_factor = Math.abs(parseFloat(num.replace(',', '.')));
            }
        }
        // Color
        else if (['blue', 'violet', 'green', 'red'].includes(part.toLowerCase())) {
            if (part.toLowerCase() === 'blue') eye.color = 'Синий';
            if (part.toLowerCase() === 'violet') eye.color = 'Фиолетовый';
            if (part.toLowerCase() === 'green') eye.color = 'Зелёный';
            if (part.toLowerCase() === 'red') eye.color = 'Красный';
        }
        // Single E for Spherical (e.g. 0,45)
        else if (/^0[,.]\d+$/.test(part)) {
            eye.e1 = parseFloat(part.replace(',', '.'));
        }
    });

    // Km and tp - handle "41,5-5,5" or "- 3,25" (space after minus)
    const kmTpMatch = eyeStr.match(/(?:OD|OS)\s+([\d.,]+)\s*([-+]\s*\d+[.,]?\d*)/i);
    if (kmTpMatch) {
        eye.km = parseFloat(kmTpMatch[1].replace(',', '.'));
        eye.tp = parseFloat(kmTpMatch[2].replace(/\s+/g, '').replace(',', '.'));
    } else {
        // Fallback for just Km
        const kmMatch = eyeStr.match(/(?:OD|OS)\s+([\d.,]+)/i);
        if (kmMatch) {
            eye.km = parseFloat(kmMatch[1].replace(',', '.'));
        }
    }

    // Fac if it has space (e.g. Fac 1)
    const facMatch = eyeStr.match(/Fac\s+([+-]?[\d.,]+)/i) || eyeStr.match(/F\s*([+-]?[\d.,]+)/i);
    if (facMatch) {
        eye.compression_factor = Math.abs(parseFloat(facMatch[1].replace(',', '.')));
    }

    return eye;
}

export function parseOrderTableRow(row: string): ParsedTableData {
    const data: ParsedTableData = {};
    const notesArr: string[] = [];
    
    // Check for MyOrthoK anywhere in the row (can be spelled MyOrtho-K, MyOthto K, etc.)
    const isMyOrthoK = /my\s*o\w*o[- \s]*k/i.test(row);
    
    if (row.includes('\t')) {
        const cols = row.split('\t').map(s => s.trim());
        
        // Columns mapping based on screenshot:
        // 0: date (e.g. 2026 06 10)
        // 1: clinic/company
        // 2: patient name
        // 3: qty
        // 4: characteristic (Toric)
        // 5: status
        // 6: date 2
        // 7: date short
        // 8: OD (or OS)
        // 9: OS (optional)
        
        if (cols.length >= 5) {
            
            let qtyIdx = -1;
            let charIdx = -1;
            let odStr = '';
            let osStr = '';
            let isToric = false;
            
            cols.forEach((col, idx) => {
                const cleanCol = col.replace(/["\n]/g, '').trim();
                if (cleanCol === '1' || cleanCol === '2') qtyIdx = idx;
                if (cleanCol.toLowerCase().includes('toric') || cleanCol.toLowerCase().includes('sph')) charIdx = idx;
                
                // Normalize Cyrillic ОВ to OD and О to O
                const upperCol = cleanCol.toUpperCase().replace(/[Оо][Вв]/g, 'OD').replace(/ОD/g, 'OD').replace(/ОS/g, 'OS');
                if (upperCol.startsWith('OD')) odStr = cleanCol;
                if (upperCol.startsWith('OS')) osStr = cleanCol;
            });

            if (qtyIdx !== -1) {
                data.qty = parseInt(cols[qtyIdx], 10);
                if (qtyIdx >= 2) {
                    data.patientName = cols[qtyIdx - 1];
                    data.company = cols[qtyIdx - 2];
                } else if (qtyIdx === 1) {
                    data.patientName = cols[0];
                }
            }
            
            if (charIdx !== -1) {
                isToric = cols[charIdx].toLowerCase().includes('toric');
            }
            
            // Global Dk fallback
            let globalDk = '100';
            if (/dk\s*125/i.test(row)) globalDk = '125';
            else if (/dk\s*50/i.test(row)) globalDk = '50';
            else if (/dk\s*180/i.test(row)) globalDk = '180';

            if (odStr) {
                data.od = parseEyeString(odStr, isToric);
                if (data.od && isMyOrthoK) data.od.myorthok = true;
                if (data.od && !/dk/i.test(odStr)) data.od.dk = globalDk;
            }
            if (osStr) {
                data.os = parseEyeString(osStr, isToric);
                if (data.os && isMyOrthoK) data.os.myorthok = true;
                if (data.os && !/dk/i.test(osStr)) data.os.dk = globalDk;
            }
            
            // Assign qty to eyes
            if (data.qty === 2) {
                if (data.od) data.od.qty = 1;
                if (data.os) data.os.qty = 1;
            } else if (data.qty === 1) {
                if (data.od && !data.os) data.od.qty = 1;
                else if (data.os && !data.od) data.os.qty = 1;
            }
        }
    }
    
    if (notesArr.length > 0) {
        data.notes = notesArr.join('\n');
    }

    return data;
}
