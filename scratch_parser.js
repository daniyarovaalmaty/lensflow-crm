const lines = [
    "OD 41,5 -6,5 t1.5 D10,8 0,55/0,46 Fac+2.0",
    "OS 41,75 -7 t1,5 D10,8 0,55/0,46 Fac+2.0",
    "OD 43.65 -6.75 D10.7 t1 0.53/0.50 Fac +2.9 blue",
    "OD 43,5 -6,25 t1.5 D11 0,50/0,50 Fac+1,75",
    "OD 41.25 -3.25 D11 t0.75 0.48/0.46 Fac+1.5",
    "OD 44 -2 D10.9 t1.5 0,59/0,52 Fac+1"
];

function parseLine(line) {
    const data = { eye: null, km: null, target: null, tor: null, dia: null, e1: null, e2: null, fac: null, color: null };
    
    // eye
    if (line.includes('OD')) data.eye = 'OD';
    else if (line.includes('OS')) data.eye = 'OS';

    // Normalize comma to dot for numbers
    // But be careful, we need to extract first.
    const parts = line.split(/\s+/);
    parts.forEach(part => {
        if (part === 'OD' || part === 'OS') return;
        
        // E1/E2
        if (part.includes('/')) {
            const [e1, e2] = part.split('/');
            data.e1 = parseFloat(e1.replace(',', '.'));
            data.e2 = parseFloat(e2.replace(',', '.'));
        }
        // DIA
        else if (part.startsWith('D') && !isNaN(parseFloat(part.substring(1).replace(',', '.')))) {
            data.dia = parseFloat(part.substring(1).replace(',', '.'));
        }
        // Tor
        else if (part.startsWith('t') && !isNaN(parseFloat(part.substring(1).replace(',', '.')))) {
            data.tor = parseFloat(part.substring(1).replace(',', '.'));
        }
        // Color
        else if (['blue', 'violet', 'green'].includes(part.toLowerCase())) {
            data.color = part;
        }
        // Fac (might have space before number, so we need to handle that)
        else if (part.toLowerCase().startsWith('fac')) {
            // we will handle fac in another pass
        }
    });

    // To handle numbers (Km, target)
    const numRegex = /-?\d+([.,]\d+)?/g;
    const nums = [...line.matchAll(numRegex)].map(m => m[0]);
    // The first standalone number is usually Km
    // The second is usually Target
    // Let's filter out numbers that were part of D, t, E1/E2
    // Actually, a better regex is needed.
    
    // Better way:
    // Km is the first number right after OD/OS
    const kmMatch = line.match(/(?:OD|OS)\s+([\d.,]+)/);
    if (kmMatch) data.km = parseFloat(kmMatch[1].replace(',', '.'));
    
    // Target is the next number, usually negative
    const targetMatch = line.match(/(?:OD|OS)\s+[\d.,]+\s+([-+]\d+[.,]?\d*)/);
    if (targetMatch) data.target = parseFloat(targetMatch[1].replace(',', '.'));

    // Fac
    const facMatch = line.match(/Fac\s*([+-]?[\d.,]+)/i);
    if (facMatch) data.fac = facMatch[1].replace(',', '.');

    return data;
}

lines.forEach(l => console.log(parseLine(l)));
