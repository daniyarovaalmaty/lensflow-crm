/**
 * Topographer File & Image Parser Module
 * Supports parsing exported files (.des, .csv, .txt, .xml) AND photos/screenshots (.jpg, .png, .jpeg, .webp)
 * from Corneal Topographers: CSO EyeTop / Antares / Keratron / Medmont / Pentacam / Shin-Nippon / TMS
 */

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

    // Check if uploaded file is an image (.jpg, .png, .heic, .heif, .pdf, etc.)
    const isImage = file.type.startsWith('image/') ||
        file.type.includes('heic') || file.type.includes('heif') ||
        fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ||
        fileName.endsWith('.png') || fileName.endsWith('.webp') ||
        fileName.endsWith('.heic') || fileName.endsWith('.heif') ||
        fileName.endsWith('.bmp') || fileName.endsWith('.pdf');

    if (isImage) {
        return parseTopographyImageApi(file);
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
 * Fast client-side image resizing & compression to max 1200px width (~80KB)
 */
export async function compressImageForOcr(file: File): Promise<Blob> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !file.type.startsWith('image/')) return resolve(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height);
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(file);

                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => resolve(blob || file),
                    'image/jpeg',
                    0.80
                );
            };
            img.onerror = () => resolve(file);
            img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

/**
 * Sends photo/image to Server OCR API Route `/api/topography/parse-image`
 */
export async function parseTopographyImageApi(file: File): Promise<ParsedTopographyData> {
    try {
        const compressedBlob = await compressImageForOcr(file);
        const formData = new FormData();
        formData.append('file', compressedBlob, file.name || 'topography.jpg');

        const res = await fetch('/api/topography/parse-image', {
            method: 'POST',
            body: formData,
        });

        if (res.ok) {
            const data = await res.json();
            return {
                od: data.od || {},
                os: data.os || {},
                sourceType: data.sourceType || 'Распознано по фото (AI OCR)',
                rawFileName: file.name,
            };
        }
    } catch (e) {
        console.error('Failed to parse topography image via API:', e);
    }

    return {
        od: {},
        os: {},
        sourceType: 'Не удалось распознать фото',
        rawFileName: file.name,
    };
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
