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
    };
}

function parseEyeString(eyeStr: string, isToric: boolean): ParsedTableData['od'] {
    if (!eyeStr) return undefined;
    
    const eye: ParsedTableData['od'] = {
        characteristic: isToric ? 'toric' : 'spherical',
        dk: '100' // Default DK 100 as requested
    };

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
        // Fac (compression factor)
        else if (part.toLowerCase().startsWith('fac')) {
            const num = part.substring(3);
            if (num) {
                eye.compression_factor = parseFloat(num.replace(',', '.'));
            }
        }
        // Color
        else if (['blue', 'violet', 'green'].includes(part.toLowerCase())) {
            if (part.toLowerCase() === 'blue') eye.color = 'Синий';
            if (part.toLowerCase() === 'violet') eye.color = 'Фиолетовый';
            if (part.toLowerCase() === 'green') eye.color = 'Зелёный';
        }
    });

    // Km - usually the first number right after OD/OS
    const kmMatch = eyeStr.match(/(?:OD|OS)\s+([\d.,]+)/i);
    if (kmMatch) {
        eye.km = parseFloat(kmMatch[1].replace(',', '.'));
    }

    // tp (target) - usually the second number
    const tpMatch = eyeStr.match(/(?:OD|OS)\s+[\d.,]+\s+([-+]\d+[.,]?\d*)/i);
    if (tpMatch) {
        eye.tp = parseFloat(tpMatch[1].replace(',', '.'));
    }

    // Fac if it has space (e.g. Fac 1)
    const facMatch = eyeStr.match(/Fac\s+([+-]?[\d.,]+)/i);
    if (facMatch) {
        eye.compression_factor = parseFloat(facMatch[1].replace(',', '.'));
    }

    return eye;
}

export function parseOrderTableRow(row: string): ParsedTableData {
    const data: ParsedTableData = {};
    const notesArr: string[] = [];
    
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
                if (col === '1' || col === '2') qtyIdx = idx;
                if (col.toLowerCase().includes('toric') || col.toLowerCase().includes('sph')) charIdx = idx;
                
                const upperCol = col.toUpperCase();
                if (upperCol.startsWith('OD')) odStr = col;
                if (upperCol.startsWith('OS')) osStr = col;
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
            
            if (odStr) {
                data.od = parseEyeString(odStr, isToric);
            }
            if (osStr) {
                data.os = parseEyeString(osStr, isToric);
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
