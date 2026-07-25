/**
 * Mountford Orthokeratology Formulas & Calculation Module
 * Based on John Mountford, David Ruston, Trusit Dave - "Orthokeratology"
 */

export interface PatientEyeInput {
    sph: number;  // Sphere (D)
    cyl: number;  // Cylinder (D)
    fk: number;   // Flat Keratometry / Flat K (D)
    ks?: number;  // Steep Keratometry / Steep K (D)
    tor?: number; // Toricity / Peripheral Astigmatism ΔK (D)
    ex: number;   // Flat Eccentricity (e_x)
    ey?: number;  // Steep Eccentricity (e_y)
    hvid: number; // Corneal diameter / White-to-White (mm)
}

export interface MountfordCalculatedResult {
    spheroEquivalent: number; // SE = Sph + Cyl / 2 (D)
    cornealAstigmatism: number; // ΔK = Ks - Fk or Tor (D)
    recommendedToricity: 'T0.0' | 'T1.0' | 'T1.5' | 'T2.0';
    recommendedToricityValue: number; // 0.0, 1.0, 1.5, 2.0
    targetDiameter: number; // DIA = HVID - 1.0 (mm)
    bozrDiopters: number; // BOZR in D = Fk - SE - 0.50
    bozrMm: number; // BOZR in mm = 337.5 / BOZR(D)
    sagCorneaMm: number; // Sagittal height of cornea in mm
    sagCorneaMicrons: number; // Sagittal height of cornea in μm
    recommendedType: 'spherical' | 'toric';
}

/**
 * Calculates Spheroequivalent (SE / TP)
 * SE = Sph + Cyl / 2
 */
export function calculateSpheroEquivalent(sph: number, cyl: number): number {
    return Math.round((sph + (cyl / 2)) * 100) / 100;
}

/**
 * Calculates Corneal Sagittal Height (Sag_cornea) in mm
 * Equation 2.4 / 2.6 in Mountford's Orthokeratology
 *
 * Sag_cornea = (R0 - sqrt(R0^2 - y^2 * p)) / p
 * R0 = 337.5 / Fk (apical radius of curvature in mm)
 * y = chord / 2 = (HVID - 1.0) / 2 (half chord in mm)
 * p = 1 - ex^2 (shape factor)
 */
export function calculateSagCornea(fk: number, ex: number, hvid: number): number {
    if (!fk || fk <= 0) return 0;
    const r0 = 337.5 / fk;
    const chord = Math.max(8.0, Math.min(12.5, hvid - 1.0));
    const y = chord / 2;
    const e = Math.max(0, Math.min(0.9, ex || 0.5));
    const p = 1 - (e * e);

    if (p <= 0) return 0;

    const term = (r0 * r0) - (y * y * p);
    if (term < 0) return 0;

    const sag = (r0 - Math.sqrt(term)) / p;
    return Math.round(sag * 10000) / 10000;
}

/**
 * Calculates Base Optic Zone Radius (BOZR) with Mountford Compression Factor (0.50 D)
 */
export function calculateBozr(fk: number, se: number, compressionFactor: number = 0.50): { bozrD: number; bozrMm: number } {
    const bozrD = Math.round((fk - se - compressionFactor) * 100) / 100;
    const bozrMm = Math.round((337.5 / bozrD) * 100) / 100;
    return { bozrD, bozrMm };
}

/**
 * Evaluates Toricity Step based on Corneal Astigmatism ΔK = Ks - Fk or direct Tor
 */
export function calculateToricity(ks: number, fk: number, torInput?: number): { toricity: 'T0.0' | 'T1.0' | 'T1.5' | 'T2.0'; value: number; type: 'spherical' | 'toric' } {
    const deltaK = (torInput !== undefined && !isNaN(torInput) && torInput > 0)
        ? Math.round(torInput * 100) / 100
        : Math.max(0, Math.round((ks - fk) * 100) / 100);

    if (deltaK < 1.25) {
        return { toricity: 'T0.0', value: 0.0, type: 'spherical' };
    } else if (deltaK < 1.75) {
        return { toricity: 'T1.0', value: 1.0, type: 'toric' };
    } else if (deltaK < 2.25) {
        return { toricity: 'T1.5', value: 1.5, type: 'toric' };
    } else {
        return { toricity: 'T2.0', value: 2.0, type: 'toric' };
    }
}

/**
 * Evaluates Primary Calculations according to Mountford Textbook
 */
export function calculateMountfordPrimary(input: PatientEyeInput): MountfordCalculatedResult {
    const se = calculateSpheroEquivalent(input.sph, input.cyl);
    const effectiveKs = (input.ks !== undefined && !isNaN(input.ks)) ? input.ks : (input.fk + (input.tor || 0));
    const deltaK = (input.tor !== undefined && !isNaN(input.tor) && input.tor > 0)
        ? Math.round(input.tor * 100) / 100
        : Math.max(0, Math.round((effectiveKs - input.fk) * 100) / 100);

    const torRes = calculateToricity(effectiveKs, input.fk, input.tor);
    const dia = Math.round(Math.max(9.5, Math.min(11.5, input.hvid - 1.0)) * 10) / 10;
    const bozr = calculateBozr(input.fk, se);
    const sagMm = calculateSagCornea(input.fk, input.ex, input.hvid);

    return {
        spheroEquivalent: se,
        cornealAstigmatism: deltaK,
        recommendedToricity: torRes.toricity,
        recommendedToricityValue: torRes.value,
        targetDiameter: dia,
        bozrDiopters: bozr.bozrD,
        bozrMm: bozr.bozrMm,
        sagCorneaMm: sagMm,
        sagCorneaMicrons: Math.round(sagMm * 1000),
        recommendedType: torRes.type,
    };
}

/**
 * Mountford Fluorescein & Topography Fit Modification Rules
 */
export interface FitAdjustmentInput {
    fitAssessment: 'optimal' | 'tight' | 'loose' | 'decentration_up' | 'decentration_down' | 'decentration_lateral';
    overRefractionSph: number; // D
    overRefractionCyl: number; // D
    currentFk: number;
    currentEx: number;
    currentDia: number;
    currentSe: number;
}

export interface FitAdjustmentResult {
    adjustedFk: number;
    adjustedEx: number;
    adjustedDia: number;
    adjustedTargetPower: number;
    explanation: string[];
}

export function evaluateMountfordAdjustment(input: FitAdjustmentInput): FitAdjustmentResult {
    let fk = input.currentFk;
    let ex = input.currentEx;
    let dia = input.currentDia;
    let seOver = calculateSpheroEquivalent(input.overRefractionSph, input.overRefractionCyl);
    let targetPower = input.currentSe + seOver + 0.50; // Overrefraction + compression factor
    const explanations: string[] = [];

    if (seOver !== 0) {
        explanations.push(`Учтена оверрефракция SE = ${seOver > 0 ? '+' : ''}${seOver.toFixed(2)} D.`);
    }

    switch (input.fitAssessment) {
        case 'tight':
            fk = Math.round((fk - 0.50) * 100) / 100;
            ex = Math.round((ex + 0.05) * 100) / 100;
            explanations.push('Тугая посадка (высокий сагиттал): Fk уплощен на -0.50 D, ex увеличен на +0.05.');
            break;
        case 'loose':
            fk = Math.round((fk + 0.50) * 100) / 100;
            ex = Math.max(0.30, Math.round((ex - 0.05) * 100) / 100);
            explanations.push('Свободная посадка (низкий сагиттал): Fk сделан круче на +0.50 D, ex уменьшен на -0.05.');
            break;
        case 'decentration_up':
            fk = Math.round((fk + 0.50) * 100) / 100;
            explanations.push('Децентрация вверх (Smiley face / линза плоская): Fk сделан круче на +0.50 D для повышения сагиттала.');
            break;
        case 'decentration_down':
            fk = Math.round((fk - 0.50) * 100) / 100;
            explanations.push('Децентрация вниз (Frowny face / линза крутая): Fk уплощен на -0.50 D для понижения сагиттала.');
            break;
        case 'decentration_lateral':
            dia = Math.round((dia + 0.20) * 10) / 10;
            explanations.push('Латеральная децентрация (вбок): Диаметр увеличен на +0.2 мм, рекомендуется торическая опора.');
            break;
        case 'optimal':
        default:
            explanations.push('Посадка линзы оптимальная (Bull\'s eye).');
            break;
    }

    return {
        adjustedFk: fk,
        adjustedEx: ex,
        adjustedDia: dia,
        adjustedTargetPower: Math.round(targetPower * 100) / 100,
        explanation: explanations,
    };
}
