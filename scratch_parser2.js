const row = "2026 06 10\tZKK 11\tЕрдос Темирлан\t2\tToric\tордер забит\t11.06.2026\t11.06\tOD 43.65 -6.75 D10.7 t1 0.53/0.50 Fac +2.9 blue\tOS 43.65 -6.25 D10.7 t1.25 0.53/0.50 Fac +2.7 violet";

function parseRow(text) {
    const data = {
        company: null,
        patientName: null,
        qty: null,
        characteristic: null,
        od: null,
        os: null
    };

    if (text.includes('\t')) {
        const cols = text.split('\t').map(s => s.trim());
        // Assume structure based on screenshot:
        // 0: date
        // 1: clinic
        // 2: patient
        // 3: qty
        // 4: characteristic
        // 5: status
        // 6: date
        // 7: date short
        // 8: OD (or OS)
        // 9: OS (optional)

        if (cols.length >= 9) {
            data.company = cols[1];
            data.patientName = cols[2];
            data.qty = parseInt(cols[3], 10);
            
            // Map characteristic
            const charCol = cols[4].toLowerCase();
            if (charCol.includes('toric')) data.characteristic = 'toric';
            else if (charCol.includes('sph')) data.characteristic = 'spherical';

            cols.forEach(col => {
                if (col.startsWith('OD')) data.od = col;
                if (col.startsWith('OS')) data.os = col;
            });
        }
    }
    return data;
}

console.log(parseRow(row));
