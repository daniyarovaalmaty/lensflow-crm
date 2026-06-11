const row = `Astramed  \tДаркабек Гаухар  DK125  LF-AC31\t2\tSphere\tордер забит\t\t\t"OD  41,5-5,5 D10,8 0,45  violet  DK125\n"\t"OS 42-6,25 D10,8 0,45   blue DK125`;

function parseEyeString(eyeStr, isToric) {
    if (!eyeStr) return undefined;
    
    // Remove quotes and newlines
    eyeStr = eyeStr.replace(/["\n]/g, ' ').trim();
    
    const eye = {
        characteristic: isToric ? 'toric' : 'spherical',
        dk: '100'
    };
    
    if (/dk\s*125/i.test(eyeStr)) eye.dk = '125';
    else if (/dk\s*50/i.test(eyeStr)) eye.dk = '50';
    else if (/dk\s*180/i.test(eyeStr)) eye.dk = '180';

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
            if (part.toLowerCase() === 'blue') eye.color = 'Синий';
            if (part.toLowerCase() === 'violet') eye.color = 'Фиолетовый';
            if (part.toLowerCase() === 'green') eye.color = 'Зелёный';
        }
        // Single E (e.g. 0,45)
        else if (/^0[,.]\d+$/.test(part)) {
            eye.e1 = parseFloat(part.replace(',', '.'));
        }
    });

    // Km and tp - now handling "41,5-5,5" (no space between Km and tp)
    // We can match OD/OS followed by Km ([\d.,]+), optionally spaces, then Tp ([-+]\d+[.,]?\d*)
    const kmTpMatch = eyeStr.match(/(?:OD|OS)\s+([\d.,]+)\s*([-+]\d+[.,]?\d*)/i);
    if (kmTpMatch) {
        eye.km = parseFloat(kmTpMatch[1].replace(',', '.'));
        eye.tp = parseFloat(kmTpMatch[2].replace(',', '.'));
    } else {
        // Fallback for just Km
        const kmMatch = eyeStr.match(/(?:OD|OS)\s+([\d.,]+)/i);
        if (kmMatch) eye.km = parseFloat(kmMatch[1].replace(',', '.'));
    }

    const facMatch = eyeStr.match(/Fac\s+([+-]?[\d.,]+)/i);
    if (facMatch) {
        eye.compression_factor = parseFloat(facMatch[1].replace(',', '.'));
    }

    return eye;
}

const data = {};
const cols = row.split('\t').map(s => s.trim().replace(/^"|"$/g, ''));
console.log("Cols:", cols);

let charIdx = -1;
let odStr = '';
let osStr = '';

cols.forEach((col, idx) => {
    if (col.toLowerCase().includes('toric') || col.toLowerCase().includes('sph')) charIdx = idx;
    
    const upperCol = col.toUpperCase().replace(/["\n]/g, '').trim();
    if (upperCol.startsWith('OD')) odStr = col;
    if (upperCol.startsWith('OS')) osStr = col;
});

const isToric = charIdx !== -1 ? cols[charIdx].toLowerCase().includes('toric') : false;

// DK global fallback
let globalDk = '100';
if (/dk\s*125/i.test(row)) globalDk = '125';
else if (/dk\s*50/i.test(row)) globalDk = '50';
else if (/dk\s*180/i.test(row)) globalDk = '180';

console.log("OD String:", odStr);
data.od = parseEyeString(odStr, isToric);
if (data.od && !/dk/i.test(odStr)) data.od.dk = globalDk;

console.log("OS String:", osStr);
data.os = parseEyeString(osStr, isToric);
if (data.os && !/dk/i.test(osStr)) data.os.dk = globalDk;

console.dir(data, {depth: null});
