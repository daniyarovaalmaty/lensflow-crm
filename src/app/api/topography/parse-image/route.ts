export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import convert from 'heic-convert';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        let buffer = Buffer.from(await file.arrayBuffer());
        const fileNameLower = file.name.toLowerCase();

        // Convert Apple iPhone HEIC/HEIF photos to JPEG on server side
        if (fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif') || file.type.includes('heic') || file.type.includes('heif')) {
            try {
                const converted = await convert({
                    buffer: buffer,
                    format: 'JPEG',
                    quality: 0.90,
                });
                buffer = Buffer.from(converted);
            } catch (err) {
                console.error('Server HEIC image conversion warning:', err);
            }
        }

        // Perform fast OCR on image buffer
        const worker = await createWorker('eng+rus');
        const ret = await worker.recognize(buffer);
        await worker.terminate();

        const text = ret.data.text || '';
        const normalizedText = text.replace(/,/g, '.');

        const od: any = {};
        const os: any = {};

        // Helper to convert Radius (mm) to Diopters (D): K = 337.5 / R
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

        // 3. Eccentricity Flat (ex / e1 / e / ecc / e_x)
        const exMatches = [...normalizedText.matchAll(/(?:Ecc\s*flat|ex|e1|Em|Eccentricity|Eflat|e\s*flat|Ecc|e_x|e\b|эксцентриситет|экс)[^\d]*(\d{1}\.\d{2,3})/gi)];
        if (exMatches.length > 0) {
            const v = parseFloat(exMatches[0][1]);
            if (v >= 0.15 && v <= 0.95) od.ex = v;
            if (exMatches.length > 1) {
                const v2 = parseFloat(exMatches[1][1]);
                if (v2 >= 0.15 && v2 <= 0.95) os.ex = v2;
            }
        }

        // 4. HVID / W2W / Diameter
        const hvidMatches = [...normalizedText.matchAll(/(?:HVID|W2W|White\s*to\s*White|Diam|WTW|диаметр|в2в)[^\d]*(\d{2}\.\d{1,2})/gi)];
        if (hvidMatches.length > 0) {
            const v = parseFloat(hvidMatches[0][1]);
            if (v >= 10.0 && v <= 13.5) od.hvid = v;
            if (hvidMatches.length > 1) {
                const v2 = parseFloat(hvidMatches[1][1]);
                if (v2 >= 10.0 && v2 <= 13.5) os.hvid = v2;
            }
        }

        // 5. Fallback for K-values if regex named labels were not matched directly
        if (!od.fk) {
            const kFloats = (normalizedText.match(/\b(3[5-9]\.\d{1,2}|4[0-9]\.\d{1,2}|5[0-5]\.\d{1,2})\b/g) || [])
                .map(v => parseFloat(v))
                .filter(v => v >= 35.0 && v <= 55.0);

            if (kFloats.length > 0) {
                kFloats.sort((a, b) => a - b);
                od.fk = kFloats[0];
                if (kFloats.length > 1) {
                    od.ks = kFloats[kFloats.length - 1];
                }
            }
        }

        // Fallback for Radius of Curvature (mm) values (e.g. 7.94, 7.71)
        if (!od.fk) {
            const rFloats = (normalizedText.match(/\b([6-8]\.\d{2,3})\b/g) || [])
                .map(v => parseFloat(v))
                .filter(v => v >= 6.50 && v <= 9.10);

            if (rFloats.length > 0) {
                rFloats.sort((a, b) => b - a); // Flattest radius (largest mm) = smallest K
                od.fk = Math.round((337.5 / rFloats[0]) * 100) / 100;
                if (rFloats.length > 1) {
                    od.ks = Math.round((337.5 / rFloats[rFloats.length - 1]) * 100) / 100;
                }
            }
        }

        // Fallback for Ex (0.30 - 0.85)
        if (!od.ex) {
            const eFloats = (normalizedText.match(/\b(0\.[2-8]\d{1,2})\b/g) || [])
                .map(v => parseFloat(v))
                .filter(v => v >= 0.20 && v <= 0.85);
            if (eFloats.length > 0) {
                od.ex = eFloats[0];
            }
        }

        // Fallback for HVID (10.5 - 13.0)
        if (!od.hvid) {
            const hvidFloats = (normalizedText.match(/\b(1[0-2]\.[0-9]{1,2})\b/g) || [])
                .map(v => parseFloat(v))
                .filter(v => v >= 10.4 && v <= 13.0);
            if (hvidFloats.length > 0) {
                od.hvid = hvidFloats[0];
            }
        }

        // If OS has no explicit data, mirror OD to OS so both eyes populate in calculator
        if (!os.fk && od.fk) os.fk = od.fk;
        if (!os.ks && od.ks) os.ks = od.ks;
        if (!os.ex && od.ex) os.ex = od.ex;
        if (!os.hvid && od.hvid) os.hvid = od.hvid;

        return NextResponse.json({
            od,
            os,
            sourceType: 'Распознано по фото топографа (AI OCR)',
            rawText: text.substring(0, 500),
        });
    } catch (error: any) {
        console.error('API /api/topography/parse-image error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process image' }, { status: 500 });
    }
}
