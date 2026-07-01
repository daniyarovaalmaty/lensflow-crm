const row = `ZKK 11\tМедина DK180\t2\tToric\tордер забит\t11.06.2026\t11.06\tОВ 40,25 - 3,25 D10.8 t1.25 0,52/0,47 Fac+1,5  DK 180 green\tОS 40,10 -3 D10.8 t1,25 0,52/0,47 Fac+1,5   DK 180 red`;

const colorsList = ['blue', 'violet', 'green', 'red'];

const cols = row.split('\t');
cols.forEach(col => {
    let cleanCol = col.replace(/["\n]/g, '').trim();
    // Normalize Cyrillic ОВ to OD, Cyrillic ОD to OD, Cyrillic ОS to OS
    const upperCol = cleanCol.toUpperCase().replace(/[Оо][Вв]/g, 'OD').replace(/[Оо]D/g, 'OD').replace(/[Оо]S/g, 'OS');
    
    // Also, when parsing eye string:
    let eyeStr = upperCol;
    eyeStr = eyeStr.replace(/[Оо][Вв]/ig, 'OD').replace(/[Оо]D/ig, 'OD').replace(/[Оо]S/ig, 'OS');
    
    // Check kmTpMatch
    // "OD 40,25 - 3,25" -> the spaces around the minus sign
    const kmTpMatch = eyeStr.match(/(?:OD|OS)\s+([\d.,]+)\s*([-+]\s*\d+[.,]?\d*)/i);
    
    if (upperCol.startsWith('OD') || upperCol.startsWith('OS')) {
        console.log("Found:", upperCol.substring(0, 2));
        if (kmTpMatch) {
            console.log("Km:", parseFloat(kmTpMatch[1].replace(',', '.')));
            console.log("Tp:", parseFloat(kmTpMatch[2].replace(/\s+/g, '').replace(',', '.')));
        }
        
        const parts = eyeStr.split(/\s+/);
        parts.forEach(part => {
             if (colorsList.includes(part.toLowerCase())) {
                 console.log("Color:", part);
             }
        });
    }
});
