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
        qty?: number;
    };
}

function parseEyeString(eyeStr: string, isToric: boolean): ParsedTableData['od'] {
    if (!eyeStr) return undefined;
    
    const eye: ParsedTableData['od'] = {
        characteristic: isToric ? 'toric' : 'spherical'
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
            data.company = cols[1];
            data.patientName = cols[2];
            
            const rawQty = parseInt(cols[3], 10);
            if (!isNaN(rawQty)) data.qty = rawQty;
            
            const isToric = cols[4].toLowerCase().includes('toric');
            
            let odStr = '';
            let osStr = '';
            
            cols.forEach(col => {
                const upperCol = col.toUpperCase();
                if (upperCol.startsWith('OD')) odStr = col;
                if (upperCol.startsWith('OS')) osStr = col;
            });
            
            if (odStr) {
                data.od = parseEyeString(odStr, isToric);
                // Extract Fac from OD
                const facMatch = odStr.match(/Fac\s*([+-]?[\d.,]+)/i);
                if (facMatch) notesArr.push(`OD Fac: ${facMatch[1]}`);
            }
            if (osStr) {
                data.os = parseEyeString(osStr, isToric);
                // Extract Fac from OS
                const facMatch = osStr.match(/Fac\s*([+-]?[\d.,]+)/i);
                if (facMatch) notesArr.push(`OS Fac: ${facMatch[1]}`);
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
