/**
 * Diagnostic Trial Kit Matrix (Набор ДК 50)
 * 14 Base Curve columns (FK 40.0 ... 46.5) x 10 Row Variants (A1 ... V10)
 */

export interface TrialLensSpec {
    code: string;
    fk: number;
    power: number; // Always -4.0 D for trial set
    toricity: string; // T0.0, T1.0, T1.5, T2.0
    toricityVal: number; // 0.0, 1.0, 1.5, 2.0
    dia: number; // 10.2, 10.3, 10.4, 10.6, 10.8
    ex: number; // 0.42, 0.50, 0.55
}

export const FK_COLUMNS = [40.0, 40.5, 41.0, 41.5, 42.0, 42.5, 43.0, 43.5, 44.0, 44.5, 45.0, 45.5, 46.0, 46.5];

export const COLUMN_LETTERS: Record<number, string> = {
    40.0: 'A',
    40.5: 'B',
    41.0: 'C',
    41.5: 'D',
    42.0: 'E',
    42.5: 'H',
    43.0: 'K',
    43.5: 'M',
    44.0: 'N',
    44.5: 'P',
    45.0: 'R',
    45.5: 'S',
    46.0: 'T',
    46.5: 'V',
};

export const ROW_SPECS: Record<number, { toricity: string; toricityVal: number; dia: number; diaSpecial?: Record<number, number>; ex: number }> = {
    1: { toricity: 'T0.0', toricityVal: 0.0, dia: 10.3, ex: 0.50 },
    2: { toricity: 'T0.0', toricityVal: 0.0, dia: 10.6, ex: 0.50 },
    3: { toricity: 'T1.0', toricityVal: 1.0, dia: 10.2, diaSpecial: { 43.0: 10.4, 43.5: 10.4, 44.0: 10.4, 44.5: 10.4 }, ex: 0.42 },
    4: { toricity: 'T1.0', toricityVal: 1.0, dia: 10.2, diaSpecial: { 43.0: 10.4, 43.5: 10.4, 44.0: 10.4, 44.5: 10.4 }, ex: 0.50 },
    5: { toricity: 'T1.0', toricityVal: 1.0, dia: 10.2, diaSpecial: { 43.0: 10.4, 43.5: 10.4, 44.0: 10.4, 44.5: 10.4 }, ex: 0.55 },
    6: { toricity: 'T1.0', toricityVal: 1.0, dia: 10.6, ex: 0.42 },
    7: { toricity: 'T1.0', toricityVal: 1.0, dia: 10.6, ex: 0.50 },
    8: { toricity: 'T1.0', toricityVal: 1.0, dia: 10.6, ex: 0.55 },
    9: { toricity: 'T1.5', toricityVal: 1.5, dia: 10.8, ex: 0.50 },
    10: { toricity: 'T2.0', toricityVal: 2.0, dia: 10.4, ex: 0.50 },
};

/**
 * Gets exact trial lens spec for column FK and row number (1-10)
 */
export function getTrialLensSpec(fk: number, row: number): TrialLensSpec {
    const colLetter = COLUMN_LETTERS[fk] || 'A';
    const rowSpec = ROW_SPECS[row] || ROW_SPECS[1];
    let dia = rowSpec.dia;

    if (rowSpec.diaSpecial && rowSpec.diaSpecial[fk]) {
        dia = rowSpec.diaSpecial[fk];
    }

    return {
        code: `${colLetter}${row}`,
        fk,
        power: -4.0,
        toricity: rowSpec.toricity,
        toricityVal: rowSpec.toricityVal,
        dia,
        ex: rowSpec.ex,
    };
}

/**
 * Finds the nearest FK step in the trial kit grid
 */
export function findNearestFk(fkInput: number): number {
    let nearest = FK_COLUMNS[0];
    let minDiff = Math.abs(fkInput - nearest);

    for (const fk of FK_COLUMNS) {
        const diff = Math.abs(fkInput - fk);
        if (diff < minDiff) {
            minDiff = diff;
            nearest = fk;
        }
    }

    return nearest;
}

/**
 * Recommends optimal Trial Lens from Set ДК 50 based on patient parameters
 */
export function recommendD50TrialLens(params: {
    fk: number;
    ks: number;
    ex: number;
    hvid: number;
}): {
    primaryLens: TrialLensSpec;
    alternativeLenses: TrialLensSpec[];
    reasoning: string[];
} {
    const { fk, ks, ex, hvid } = params;
    const reasoning: string[] = [];

    const deltaK = Math.max(0, ks - fk);
    const targetDia = hvid - 1.0;

    let targetFk = fk;

    // Eccentricity adjustment rule from MediLens notes:
    // If Ex < 0.45:
    // - For spherical (T0.0) or Tor 1.5/2.0: select Ex = 0.50, but round FK UP by 0.5 D
    // - For Tor 1.0: select Ex = 0.42 row (Row 3 or Row 6)
    let selectedExRow: 0.42 | 0.50 | 0.55 = 0.50;

    if (ex < 0.45) {
        if (deltaK >= 1.25 && deltaK < 1.75) {
            selectedExRow = 0.42;
            reasoning.push(`При Ex = ${ex.toFixed(2)} (< 0.45) и торичности T1.0 выбрана строка с ex = 0.42.`);
        } else {
            targetFk = fk + 0.50;
            selectedExRow = 0.50;
            reasoning.push(`При Ex = ${ex.toFixed(2)} (< 0.45) базовый Fk сдвинут на +0.50 D (до ${targetFk.toFixed(2)} D) при ex = 0.50.`);
        }
    } else if (ex > 0.55) {
        selectedExRow = 0.55;
        reasoning.push(`При Ex = ${ex.toFixed(2)} (> 0.55) выбрана строка с ex = 0.55.`);
    } else {
        selectedExRow = 0.50;
        reasoning.push(`При Ex = ${ex.toFixed(2)} (диапазон 0.45-0.55) выбрана стандартная опора ex = 0.50.`);
    }

    const matchedFk = findNearestFk(targetFk);
    reasoning.push(`Расчетный Fk = ${targetFk.toFixed(2)} D $\\rightarrow$ Ближайший Fk в наборе: ${matchedFk.toFixed(1)} D.`);

    // Determine row number based on Toricity, DIA, and Ex
    let targetRow = 1;

    // Special HVID <= 10.4 compromise logic (New Eye clinical fitting protocol)
    const isSmallHvid = hvid <= 10.4;

    if (isSmallHvid) {
        reasoning.push(`Малый диаметр роговицы HVID = ${hvid.toFixed(1)} мм (целевой DIA = ${targetDia.toFixed(1)} мм).`);
        
        if (deltaK < 1.25) {
            targetRow = 1; // T0.0, DIA 10.3
            reasoning.push(`Выбрана линза T0.0 малого диаметра (строка 1, DIA 10.3 мм).`);
        } else if (deltaK < 1.75) {
            targetRow = selectedExRow === 0.42 ? 3 : (selectedExRow === 0.55 ? 5 : 4);
            reasoning.push(`Выбрана линза T1.0 малого диаметра (строка ${targetRow}, DIA 10.2/10.4 мм).`);
        } else if (deltaK < 2.25) {
            // Standard T1.5 (Row 9) has DIA 10.8 mm (too large for HVID <= 10.4!).
            // New Eye Compromise: Shift TOR down from T1.5 to T1.0 (Row 4, DIA 10.2 mm) for trial kit fitting
            targetRow = 4;
            reasoning.push(`⚠️ В наборе ДК 50 линза T1.5 имеет большой диаметр DIA 10.8 мм (опасность зажима лимба при HVID ${hvid.toFixed(1)} мм).`);
            reasoning.push(`💡 Протокол компромисса New Eye: торичность в пробном наборе уменьшена до T1.0 (строка 4, DIA 10.2 мм).`);
        } else {
            // T2.0 (Row 10, DIA 10.4)
            if (hvid <= 10.2) {
                targetRow = 4; // Shift down to DIA 10.2 mm (T1.0) for very small corneas
                reasoning.push(`⚠️ При сверхмалом HVID ${hvid.toFixed(1)} мм торичность снижена до T1.0 (строка 4, DIA 10.2 мм) для исключения краевого зажима.`);
            } else {
                targetRow = 10; // DIA 10.4 mm
                reasoning.push(`Выбрана строка 10 (T2.0, DIA 10.4 мм) как малый торический диаметр в наборе.`);
            }
        }
    } else {
        if (deltaK < 1.25) {
            // Spherical T0.0
            // Row 1 (DIA 10.3) vs Row 2 (DIA 10.6)
            targetRow = targetDia >= 10.5 ? 2 : 1;
            reasoning.push(`Астигматизм $\\Delta K = ${deltaK.toFixed(2)}$ D (< 1.25 D) $\\rightarrow$ Сферическая линза (T0.0), строка ${targetRow}.`);
        } else if (deltaK < 1.75) {
            // Toric T1.0
            const isLargeDia = targetDia >= 10.5;
            if (selectedExRow === 0.42) {
                targetRow = isLargeDia ? 6 : 3;
            } else if (selectedExRow === 0.55) {
                targetRow = isLargeDia ? 8 : 5;
            } else {
                targetRow = isLargeDia ? 7 : 4;
            }
            reasoning.push(`Астигматизм $\\Delta K = ${deltaK.toFixed(2)}$ D (1.25–1.75 D) $\\rightarrow$ Торическая линза T1.0, DIA ${isLargeDia ? '10.6' : '10.2/10.4'}, строка ${targetRow}.`);
        } else if (deltaK < 2.25) {
            // Toric T1.5 -> Row 9
            targetRow = 9;
            reasoning.push(`Астигматизм $\\Delta K = ${deltaK.toFixed(2)}$ D (1.75–2.25 D) $\\rightarrow$ Торическая линза T1.5, строка 9.`);
        } else {
            // Toric T2.0 -> Row 10
            targetRow = 10;
            reasoning.push(`Астигматизм $\\Delta K = ${deltaK.toFixed(2)}$ D ($\\ge 2.25$ D) $\\rightarrow$ Высокоторическая линза T2.0, строка 10.`);
        }
    }

    const primaryLens = getTrialLensSpec(matchedFk, targetRow);

    // Build alternative options (e.g. flatter/steeper by 0.5 D)
    const alternatives: TrialLensSpec[] = [];
    const fkIndex = FK_COLUMNS.indexOf(matchedFk);

    if (fkIndex > 0) {
        alternatives.push(getTrialLensSpec(FK_COLUMNS[fkIndex - 1], targetRow));
    }
    if (fkIndex < FK_COLUMNS.length - 1) {
        alternatives.push(getTrialLensSpec(FK_COLUMNS[fkIndex + 1], targetRow));
    }

    return {
        primaryLens,
        alternativeLenses: alternatives,
        reasoning,
    };
}
