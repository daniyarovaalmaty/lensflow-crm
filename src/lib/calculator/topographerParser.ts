/**
 * Topographer File & Image Parser Module
 * Supports parsing exported files (.des, .csv, .txt, .xml) AND photos/screenshots (.jpg, .png, .jpeg, .webp)
 * from Corneal Topographers: CSO EyeTop / Antares / Keratron / Medmont / Pentacam / Shin-Nippon / TMS
 */

import { createWorker } from 'tesseract.js';

export interface ParsedTopographyData {
    od?: {
        fk?: number;
        ks?: number;
        ex?: number;
        ey?: number;
        hvid?: number;
        sph?: number;
        cyl?: number;
    };
    os?: {
        fk?: number;
        ks?: number;
        ex?: number;
        ey?: number;
        hvid?: number;
        sph?: number;
        cyl?: number;
    };
    sourceType: string;
    rawFileName: string;
}

/**
 * Main entry point for parsing uploaded topographer file or photo
 */
export async function parseTopographerFile(file: File): Promise<ParsedTopographyData> {
    const fileName = file.name.toLowerCase();

    // Check if uploaded file is an image
    if (file.type.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.webp')) {
        return parseTopographyImage(file);
    }

    const text = await file.text();

    if (fileName.endsWith('.des') || text.includes('Ecc flat') || text.includes('anello')) {
        return parseDesFile(text, file.name);
    } else if (fileName.endsWith('.xml') || text.includes('<?xml')) {
        return parseXmlTopography(text, file.name);
    } else {
        return parseTextOrCsvTopography(text, file.name);
    }
}

/**
 * OCR Photo Recognition for Topographer Screen Photos & Reports
 */
export async function parseTopographyImage(file: File): Promise<ParsedTopographyData> {
    const result: ParsedTopographyData = {
        od: {},
        os: {},
        sourceType: 'Распознано с фото топографа (OCR)',
        rawFileName: file.name,
    };

    try {
        const worker = await createWorker('rus+eng');
        const imageUrl = URL.createObjectURL(file);

        const ret = await worker.recognize(imageUrl);
        await worker.terminate();
        URL.revokeObjectURL(imageUrl);

        const text = ret.data.text || '';
        const isOs = file.name.toLowerCase().includes('os') || text.includes(' OS') || text.includes('OS ') || text.includes('Left') || text.includes('Левый');
        const eyeKey = isOs ? 'os' : 'od';

        // 1. Flat K (Fk / Km / Kf / K1)
        const fkMatch = text.match(/(?:Flat\s*K|Fk|Kf|Km|K1|Flat|SimK1|SimK\s*1|FlatK)[^\d]*(\d{2}[.,]\d{1,3})/i);
        if (fkMatch) {
            const val = parseFloat(fkMatch[1].replace(',', '.'));
            if (val >= 35 && val <= 55) result[eyeKey]!.fk = val;
        }

        // 2. Steep K (Ks / Kr / K2)
        const ksMatch = text.match(/(?:Steep\s*K|Ks|Kr|K2|Steep|SimK2|SimK\s*2|SteepK)[^\d]*(\d{2}[.,]\d{1,3})/i);
        if (ksMatch) {
            const val = parseFloat(ksMatch[1].replace(',', '.'));
            if (val >= 35 && val <= 55) result[eyeKey]!.ks = val;
        }

        // 3. Eccentricity Flat (ex / Em / Ecc flat / e1)
        const exMatch = text.match(/(?:Ecc\s*flat|ex|e1|Em|Eccentricity|Eflat|e\s*flat|Ecc)[^\d]*(\d{1}[.,]\d{2,3})/i);
        if (exMatch) {
            const val = parseFloat(exMatch[1].replace(',', '.'));
            if (val >= 0.1 && val <= 0.95) result[eyeKey]!.ex = val;
        }

        // 4. HVID / W2W / Diameter
        const hvidMatch = text.match(/(?:HVID|W2W|White\s*to\s*White|Diam|WTW)[^\d]*(\d{2}[.,]\d{1,2})/i);
        if (hvidMatch) {
            const val = parseFloat(hvidMatch[1].replace(',', '.'));
            if (val >= 10.0 && val <= 13.5) result[eyeKey]!.hvid = val;
        }

        // Fallback: If numbers exist in text, search standalone floats
        if (!result[eyeKey]!.fk) {
            const standaloneK = text.match(/\b(3[6-9]\.\d{1,2}|4[0-9]\.\d{1,2}|5[0-4]\.\d{1,2})\b/g);
            if (standaloneK && standaloneK.length > 0) {
                const vals = standaloneK.map(v => parseFloat(v)).sort((a, b) => a - b);
                result[eyeKey]!.fk = vals[0];
                if (vals.length > 1) result[eyeKey]!.ks = vals[1];
            }
        }

        if (!result[eyeKey]!.ex) {
            const standaloneE = text.match(/\b(0\.[3-7]\d{1,2})\b/);
            if (standaloneE) {
                result[eyeKey]!.ex = parseFloat(standaloneE[1]);
            }
        }
    } catch (err) {
        console.error('Image OCR error:', err);
    }

    return result;
}

/**
 * Parses CSO EyeTop / Antares / Keratron .des binary/text export file
 */
function parseDesFile(content: string, fileName: string): ParsedTopographyData {
    const result: ParsedTopographyData = {
        od: {},
        os: {},
        sourceType: 'CSO EyeTop / Antares (.des)',
        rawFileName: fileName,
    };

    const isOs = fileName.includes('_os') || fileName.includes('_os.') || content.includes('OS') || content.includes('Left');
    const eyeKey = isOs ? 'os' : 'od';

    const fkMatch = content.match(/(?:Flat|KF|Fk|K1|Kflat)[^\d]*(\d{2}[.,]\d{1,3})/i);
    if (fkMatch) {
        const val = parseFloat(fkMatch[1].replace(',', '.'));
        if (val >= 35 && val <= 55) result[eyeKey]!.fk = val;
    }

    const ksMatch = content.match(/(?:Steep|KS|Ks|K2|Ksteep)[^\d]*(\d{2}[.,]\d{1,3})/i);
    if (ksMatch) {
        const val = parseFloat(ksMatch[1].replace(',', '.'));
        if (val >= 35 && val <= 55) result[eyeKey]!.ks = val;
    }

    const exMatch = content.match(/(?:Ecc\s*flat|ex|e1|Em|Eflat)[^\d]*(\d{1}[.,]\d{2,3})/i);
    if (exMatch) {
        const val = parseFloat(exMatch[1].replace(',', '.'));
        if (val >= 0.1 && val <= 0.95) result[eyeKey]!.ex = val;
    }

    const eyMatch = content.match(/(?:Ecc\s*steep|ey|e2|Esteep)[^\d]*(\d{1}[.,]\d{2,3})/i);
    if (eyMatch) {
        const val = parseFloat(eyMatch[1].replace(',', '.'));
        if (val >= 0.1 && val <= 0.95) result[eyeKey]!.ey = val;
    }

    const hvidMatch = content.match(/(?:HVID|W2W|White\s*to\s*White|Diam)[^\d]*(\d{2}[.,]\d{1,2})/i);
    if (hvidMatch) {
        const val = parseFloat(hvidMatch[1].replace(',', '.'));
        if (val >= 10.0 && val <= 13.5) result[eyeKey]!.hvid = val;
    }

    return result;
}

/**
 * Parses XML Topography Exports
 */
function parseXmlTopography(content: string, fileName: string): ParsedTopographyData {
    const result: ParsedTopographyData = {
        od: {},
        os: {},
        sourceType: 'XML Topographer Export',
        rawFileName: fileName,
    };

    const extractVal = (tag: string, str: string): number | undefined => {
        const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
        const match = str.match(regex);
        if (match) {
            const val = parseFloat(match[1].replace(',', '.'));
            if (!isNaN(val)) return val;
        }
        return undefined;
    };

    ['OD', 'OS'].forEach(eye => {
        const key = eye.toLowerCase() as 'od' | 'os';
        const eyeRegex = new RegExp(`<${eye}[^>]*>([\\s\\S]*?)</${eye}>`, 'i');
        const eyeBlock = content.match(eyeRegex)?.[1] || content;

        const fk = extractVal('FlatK', eyeBlock) || extractVal('K1', eyeBlock);
        const ks = extractVal('SteepK', eyeBlock) || extractVal('K2', eyeBlock);
        const ex = extractVal('Eccentricity', eyeBlock) || extractVal('Ex', eyeBlock);
        const hvid = extractVal('HVID', eyeBlock) || extractVal('W2W', eyeBlock);

        if (fk) result[key]!.fk = fk;
        if (ks) result[key]!.ks = ks;
        if (ex) result[key]!.ex = ex;
        if (hvid) result[key]!.hvid = hvid;
    });

    return result;
}

/**
 * Parses Plain Text or CSV Topography Exports
 */
function parseTextOrCsvTopography(content: string, fileName: string): ParsedTopographyData {
    const result: ParsedTopographyData = {
        od: {},
        os: {},
        sourceType: 'Text/CSV Topography Export',
        rawFileName: fileName,
    };

    const lines = content.split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;

        let currentEye: 'od' | 'os' = 'od';
        if (line.includes('OS') || line.includes('Left') || line.includes('ОС')) {
            currentEye = 'os';
        }

        const fkMatch = line.match(/(?:Flat\s*K|Fk|Kf|K1|Kflat)[:=\t,;\s]+(\d{2}[.,]\d{1,3})/i);
        if (fkMatch) {
            const val = parseFloat(fkMatch[1].replace(',', '.'));
            if (val >= 35 && val <= 55) result[currentEye]!.fk = val;
        }

        const ksMatch = line.match(/(?:Steep\s*K|Ks|Kr|K2|Ksteep)[:=\t,;\s]+(\d{2}[.,]\d{1,3})/i);
        if (ksMatch) {
            const val = parseFloat(ksMatch[1].replace(',', '.'));
            if (val >= 35 && val <= 55) result[currentEye]!.ks = val;
        }

        const exMatch = line.match(/(?:Eccentricity|Ecc\s*flat|ex|e1|Em)[:=\t,;\s]+(\d{1}[.,]\d{2,3})/i);
        if (exMatch) {
            const val = parseFloat(exMatch[1].replace(',', '.'));
            if (val >= 0.1 && val <= 0.95) result[currentEye]!.ex = val;
        }

        const hvidMatch = line.match(/(?:HVID|W2W|White\s*to\s*white|Diameter)[:=\t,;\s]+(\d{2}[.,]\d{1,2})/i);
        if (hvidMatch) {
            const val = parseFloat(hvidMatch[1].replace(',', '.'));
            if (val >= 10.0 && val <= 13.5) result[currentEye]!.hvid = val;
        }
    }

    return result;
}
