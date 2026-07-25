/**
 * Topographer File Parser Module
 * Supports parsing exported files (.des, .csv, .txt, .xml) from Corneal Topographers:
 * CSO EyeTop / Antares / Keratron / Medmont / Pentacam / Shin-Nippon / TMS
 */

export interface ParsedTopographyData {
    od?: {
        fk?: number;
        ks?: number;
        ex?: number;
        ey?: number;
        hvid?: number;
    };
    os?: {
        fk?: number;
        ks?: number;
        ex?: number;
        ey?: number;
        hvid?: number;
    };
    sourceType: string;
    rawFileName: string;
}

/**
 * Main entry point for parsing uploaded topographer file
 */
export async function parseTopographerFile(file: File): Promise<ParsedTopographyData> {
    const text = await file.text();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.des') || text.includes('Ecc flat') || text.includes('anello')) {
        return parseDesFile(text, file.name);
    } else if (fileName.endsWith('.xml') || text.includes('<?xml')) {
        return parseXmlTopography(text, file.name);
    } else {
        return parseTextOrCsvTopography(text, file.name);
    }
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

    // Determine eye side from filename or content
    const isOs = fileName.includes('_os') || fileName.includes('_os.') || content.includes('OS') || content.includes('Left');
    const eyeKey = isOs ? 'os' : 'od';

    // Search for pattern markers in .des text content
    // Flat Keratometry (Fk / Kf / Flat K)
    const fkMatch = content.match(/(?:Flat|KF|Fk|K1|Kflat)[^\d]*(\d{2}[.,]\d{1,3})/i);
    if (fkMatch) {
        const val = parseFloat(fkMatch[1].replace(',', '.'));
        if (val >= 35 && val <= 55) result[eyeKey]!.fk = val;
    }

    // Steep Keratometry (Ks / Kr / Steep K)
    const ksMatch = content.match(/(?:Steep|KS|Ks|K2|Ksteep)[^\d]*(\d{2}[.,]\d{1,3})/i);
    if (ksMatch) {
        const val = parseFloat(ksMatch[1].replace(',', '.'));
        if (val >= 35 && val <= 55) result[eyeKey]!.ks = val;
    }

    // Eccentricity Flat (Ecc flat / ex)
    const exMatch = content.match(/(?:Ecc\s*flat|ex|e1|Em|Eflat)[^\d]*(\d{1}[.,]\d{2,3})/i);
    if (exMatch) {
        const val = parseFloat(exMatch[1].replace(',', '.'));
        if (val >= 0.1 && val <= 0.95) result[eyeKey]!.ex = val;
    }

    // Eccentricity Steep (Ecc steep / ey)
    const eyMatch = content.match(/(?:Ecc\s*steep|ey|e2|Esteep)[^\d]*(\d{1}[.,]\d{2,3})/i);
    if (eyMatch) {
        const val = parseFloat(eyMatch[1].replace(',', '.'));
        if (val >= 0.1 && val <= 0.95) result[eyeKey]!.ey = val;
    }

    // HVID / White-to-White (W2W / HVID / Diameter)
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
 * Parses Plain Text or CSV Topography Exports (Medmont / TMS / Shin-Nippon)
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

        // Detect eye side in line if indicated
        let currentEye: 'od' | 'os' = 'od';
        if (line.includes('OS') || line.includes('Left') || line.includes('ОС')) {
            currentEye = 'os';
        }

        // Fk / Flat K
        const fkMatch = line.match(/(?:Flat\s*K|Fk|Kf|K1|Kflat)[:=\t,;\s]+(\d{2}[.,]\d{1,3})/i);
        if (fkMatch) {
            const val = parseFloat(fkMatch[1].replace(',', '.'));
            if (val >= 35 && val <= 55) result[currentEye]!.fk = val;
        }

        // Ks / Steep K
        const ksMatch = line.match(/(?:Steep\s*K|Ks|Kr|K2|Ksteep)[:=\t,;\s]+(\d{2}[.,]\d{1,3})/i);
        if (ksMatch) {
            const val = parseFloat(ksMatch[1].replace(',', '.'));
            if (val >= 35 && val <= 55) result[currentEye]!.ks = val;
        }

        // Ex / Eccentricity
        const exMatch = line.match(/(?:Eccentricity|Ecc\s*flat|ex|e1|Em)[:=\t,;\s]+(\d{1}[.,]\d{2,3})/i);
        if (exMatch) {
            const val = parseFloat(exMatch[1].replace(',', '.'));
            if (val >= 0.1 && val <= 0.95) result[currentEye]!.ex = val;
        }

        // HVID
        const hvidMatch = line.match(/(?:HVID|W2W|White\s*to\s*white|Diameter)[:=\t,;\s]+(\d{2}[.,]\d{1,2})/i);
        if (hvidMatch) {
            const val = parseFloat(hvidMatch[1].replace(',', '.'));
            if (val >= 10.0 && val <= 13.5) result[currentEye]!.hvid = val;
        }
    }

    return result;
}
