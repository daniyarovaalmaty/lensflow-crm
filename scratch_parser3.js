const row1 = "2026 06 10\tZKK 11\tЕрдос Темирлан\t2\tToric\tордер забит\t11.06.2026\t11.06\tOD 43.65 -6.75 D10.7 t1 0.53/0.50 Fac +2.9 blue\tOS 43.65 -6.25 D10.7 t1.25 0.53/0.50 Fac +2.7 violet";
const row2 = "Анна EyeMax\tҚалык Айзере  LF-АС29\t2\tToric\tордер забит\t\t\tOD 43,5 -4.5 D10.6 t1 0,58/0,58 Fac1  violet\tOS 43,5 -4.25 D10.5 t1 0,58/0,58 Fac1  green";

function parseRow(row) {
    const data = {
        company: null,
        patientName: null,
        qty: null,
        characteristic: null,
        od: null,
        os: null
    };

    if (row.includes('\t')) {
        const cols = row.split('\t').map(s => s.trim());
        
        let qtyIdx = -1;
        let charIdx = -1;
        
        cols.forEach((col, idx) => {
            if (col === '1' || col === '2') qtyIdx = idx;
            if (col.toLowerCase().includes('toric') || col.toLowerCase().includes('sph')) charIdx = idx;
            
            const upperCol = col.toUpperCase();
            if (upperCol.startsWith('OD')) data.od = parseEye(col);
            if (upperCol.startsWith('OS')) data.os = parseEye(col);
        });
        
        if (qtyIdx !== -1) {
            data.qty = parseInt(cols[qtyIdx], 10);
            if (qtyIdx >= 2) {
                // If qty is at index 2 or 3, patient is usually qtyIdx - 1, company is qtyIdx - 2
                data.patientName = cols[qtyIdx - 1];
                data.company = cols[qtyIdx - 2];
            } else if (qtyIdx === 1) {
                // e.g. Patient is not provided or Company is not provided?
                data.patientName = cols[0];
            }
        }
        
        if (charIdx !== -1) {
            data.characteristic = cols[charIdx].toLowerCase().includes('toric') ? 'toric' : 'spherical';
        }
    }
    return data;
}

function parseEye(eyeStr) {
    const eye = { dk: '100' };
    const parts = eyeStr.split(/\s+/);
    parts.forEach(part => {
        if (part === 'OD' || part === 'OS') return;
        
        if (part.includes('/')) {
            const [e1, e2] = part.split('/');
            eye.e1 = parseFloat(e1.replace(',', '.'));
            eye.e2 = parseFloat(e2.replace(',', '.'));
        }
        else if ((part.startsWith('D') || part.startsWith('d')) && !isNaN(parseFloat(part.substring(1).replace(',', '.')))) {
            eye.dia = parseFloat(part.substring(1).replace(',', '.'));
        }
        else if ((part.startsWith('t') || part.startsWith('T')) && !isNaN(parseFloat(part.substring(1).replace(',', '.')))) {
            eye.tor = parseFloat(part.substring(1).replace(',', '.'));
        }
        else if (part.toLowerCase().startsWith('fac')) {
            const num = part.substring(3);
            if (num) {
                eye.compression_factor = parseFloat(num.replace(',', '.'));
            }
        }
        else if (['blue', 'violet', 'green'].includes(part.toLowerCase())) {
            eye.color = part;
        }
    });

    // Km
    const kmMatch = eyeStr.match(/(?:OD|OS)\s+([\d.,]+)/i);
    if (kmMatch) eye.km = parseFloat(kmMatch[1].replace(',', '.'));

    // tp
    const tpMatch = eyeStr.match(/(?:OD|OS)\s+[\d.,]+\s+([-+]\d+[.,]?\d*)/i);
    if (tpMatch) eye.tp = parseFloat(tpMatch[1].replace(',', '.'));
    
    // Fac if it has space (e.g. Fac 1)
    const facMatch = eyeStr.match(/Fac\s+([+-]?[\d.,]+)/i);
    if (facMatch) eye.compression_factor = parseFloat(facMatch[1].replace(',', '.'));

    return eye;
}

console.log("Row 1:");
console.dir(parseRow(row1), {depth: null});
console.log("\nRow 2:");
console.dir(parseRow(row2), {depth: null});
