const row = `Костанай\tМарат\t2\tToric\tордер забит\t\t\tОD 39,5 -5,75 D11 t1.5 0.47/0.43 Fac+2.0\tОS 39.5 -5.50 D11 t1.5 0.45/0.42 Fac+2.0`;

const cols = row.split('\t');
cols.forEach(col => {
    const cleanCol = col.replace(/["\n]/g, '').trim();
    // Normalize Cyrillic О to Latin O for OD/OS
    const upperCol = cleanCol.toUpperCase().replace(/ОD/g, 'OD').replace(/ОS/g, 'OS');
    if (upperCol.startsWith('OD')) console.log("Found OD:", cleanCol);
    if (upperCol.startsWith('OS')) console.log("Found OS:", cleanCol);
});
