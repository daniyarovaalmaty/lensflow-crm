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
    let sourceBlob: Blob = file;
    const fileName = file.name.toLowerCase();

    // Dynamically convert HEIC/HEIF on client side if needed
    if (typeof window !== 'undefined' && (fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type.includes('heic') || file.type.includes('heif'))) {
        try {
            const heic2any = (await import('heic2any')).default;
            const converted = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.8,
            });
            sourceBlob = Array.isArray(converted) ? converted[0] : converted;
        } catch (err) {
            console.error('Client HEIC conversion error:', err);
        }
    }

    return new Promise((resolve) => {
        if (typeof window === 'undefined') return resolve(sourceBlob);

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
                if (!ctx) return resolve(sourceBlob);

                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => resolve(blob || sourceBlob),
                    'image/jpeg',
                    0.80
                );
            };
            img.onerror = () => resolve(sourceBlob);
            img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(sourceBlob);
        reader.readAsDataURL(sourceBlob);
    });
}

/**
 * Extracts topography parameters from raw OCR text
 */
export function parseTopographyText(text: string, fileName: string): ParsedTopographyData {
    const normalizedText = text.replace(/,/g, '.');
    const od: any = {};
    const os: any = {};

    const parseKVal = (valStr: string): number | null => {
        const num = parseFloat(valStr.replace(',', '.'));
        if (isNaN(num)) return null;
        if (num >= 34.0 && num <= 56.0) return Math.round(num * 100) / 100;
        if (num >= 6.40 && num <= 9.30) return Math.round((337.5 / num) * 100) / 100;
        return null;
    };

    // 1. Flat K (Fk / Km / Kf / K1 / SimK1 / R1)
    const fkMatches = [...normalizedText.matchAll(/(?:Flat\s*K|Fk|Kf|Km|K1|Flat|SimK1|SimK\s*1|FlatK|K-flat|R1|r1|Flattest|K\(flat\)|Флат|К1|Кф)[^\d]*(\d{1,2}\.\d{1,3})/gi)];
    if (fkMatches.length > 0) {
        const v = parseKVal(fkMatches[0][1]);
        if (v) od.fk = v;
        if (fkMatches.length > 1) {
            const v2 = parseKVal(fkMatches[1][1]);
            if (v2) os.fk = v2;
        }
    }

    // 2. Steep K (Ks / Kr / K2 / SimK2 / R2)
    const ksMatches = [...normalizedText.matchAll(/(?:Steep\s*K|Ks|Kr|K2|Steep|SimK2|SimK\s*2|SteepK|K-steep|R2|r2|Steepest|K\(steep\)|Стип|К2|Кс)[^\d]*(\d{1,2}\.\d{1,3})/gi)];
    if (ksMatches.length > 0) {
        const v = parseKVal(ksMatches[0][1]);
        if (v) od.ks = v;
        if (ksMatches.length > 1) {
            const v2 = parseKVal(ksMatches[1][1]);
            if (v2) os.ks = v2;
        }
    }

    // 3. Eccentricity (ex / e1 / e / ecc)
    const exMatches = [...normalizedText.matchAll(/(?:Ecc\s*flat|ex|e1|Em|Eccentricity|Eflat|e\s*flat|Ecc|e_x|e\b|эксцентриситет|экс)[^\d]*(\d{1}\.\d{2,3})/gi)];
    if (exMatches.length > 0) {
        const v = parseFloat(exMatches[0][1]);
        if (v >= 0.15 && v <= 0.95) od.ex = v;
        if (exMatches.length > 1) {
            const v2 = parseFloat(exMatches[1][1]);
            if (v2 >= 0.15 && v2 <= 0.95) os.ex = v2;
        }
    }

    // 4. HVID
    const hvidMatches = [...normalizedText.matchAll(/(?:HVID|W2W|White\s*to\s*White|Diam|WTW|диаметр|в2в)[^\d]*(\d{2}\.\d{1,2})/gi)];
    if (hvidMatches.length > 0) {
        const v = parseFloat(hvidMatches[0][1]);
        if (v >= 10.0 && v <= 13.5) od.hvid = v;
        if (hvidMatches.length > 1) {
            const v2 = parseFloat(hvidMatches[1][1]);
            if (v2 >= 10.0 && v2 <= 13.5) os.hvid = v2;
        }
    }

    // 5. Smart Fallback for Diopter floats (35.00 - 55.00)
    if (!od.fk) {
        const kFloats = (normalizedText.match(/\b(3[5-9]\.\d{1,2}|4[0-9]\.\d{1,2}|5[0-5]\.\d{1,2})\b/g) || [])
            .map(v => parseFloat(v))
            .filter(v => v >= 35.0 && v <= 55.0);

        if (kFloats.length > 0) {
            kFloats.sort((a, b) => a - b);
            od.fk = kFloats[0];
            if (kFloats.length > 1) od.ks = kFloats[kFloats.length - 1];
        }
    }

    // Fallback for Radius of Curvature (6.50 - 9.10 mm)
    if (!od.fk) {
        const rFloats = (normalizedText.match(/\b([6-8]\.\d{2,3})\b/g) || [])
            .map(v => parseFloat(v))
            .filter(v => v >= 6.50 && v <= 9.10);

        if (rFloats.length > 0) {
            rFloats.sort((a, b) => b - a);
            od.fk = Math.round((337.5 / rFloats[0]) * 100) / 100;
            if (rFloats.length > 1) od.ks = Math.round((337.5 / rFloats[rFloats.length - 1]) * 100) / 100;
        }
    }

    // Fallback for Ex (0.20 - 0.85)
    if (!od.ex) {
        const eFloats = (normalizedText.match(/\b(0\.[2-8]\d{1,2})\b/g) || [])
            .map(v => parseFloat(v))
            .filter(v => v >= 0.20 && v <= 0.85);
        if (eFloats.length > 0) od.ex = eFloats[0];
    }

    // Fallback for HVID (10.4 - 13.0)
    if (!od.hvid) {
        const hvidFloats = (normalizedText.match(/\b(1[0-2]\.[0-9]{1,2})\b/g) || [])
            .map(v => parseFloat(v))
            .filter(v => v >= 10.4 && v <= 13.0);
        if (hvidFloats.length > 0) od.hvid = hvidFloats[0];
    }

    // Auto mirror OD to OS
    if (!os.fk && od.fk) os.fk = od.fk;
    if (!os.ks && od.ks) os.ks = od.ks;
    if (!os.ex && od.ex) os.ex = od.ex;
    if (!os.hvid && od.hvid) os.hvid = od.hvid;

    return {
        od,
        os,
        sourceType: 'Распознано по фото топографа (AI OCR)',
        rawFileName: fileName,
    };
}

/**
 * Sends photo/image to Server OCR API Route `/api/topography/parse-image` with Client Fallback
 */
export async function parseTopographyImageApi(file: File): Promise<ParsedTopographyData> {
    // 1. Try Client-side Tesseract.js first (super fast in browser, no Vercel serverless timeouts)
    try {
        if (typeof window !== 'undefined') {
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('eng');
            const ret = await worker.recognize(file);
            await worker.terminate();

            const clientText = ret.data.text || '';
            const parsedClient = parseTopographyText(clientText, file.name);
            if (parsedClient.od?.fk || parsedClient.os?.fk || parsedClient.od?.ex) {
                return parsedClient;
            }
        }
    } catch (clientErr) {
        console.warn('Client OCR attempt fallback to server API:', clientErr);
    }

    // 2. Fallback to Server API Route
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
            const resOd = data.od || {};
            const resOs = data.os || {};

            if (resOd.fk || resOs.fk || resOd.ex) {
                return {
                    od: resOd,
                    os: resOs,
                    sourceType: data.sourceType || 'Распознано по фото (AI OCR)',
                    rawFileName: file.name,
                };
            }
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
