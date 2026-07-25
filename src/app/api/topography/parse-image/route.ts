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

        // Convert Apple iPhone HEIC/HEIF photos to JPEG
        if (fileNameLower.endsWith('.heic') || fileNameLower.endsWith('.heif') || file.type.includes('heic') || file.type.includes('heif')) {
            try {
                const converted = await convert({
                    buffer: buffer,
                    format: 'JPEG',
                    quality: 0.85,
                });
                buffer = Buffer.from(converted);
            } catch (err) {
                console.error('Server HEIC image conversion failed:', err);
            }
        }

        // Perform fast OCR on image buffer
        const worker = await createWorker('eng');
        const ret = await worker.recognize(buffer);
        await worker.terminate();

        const text = ret.data.text || '';
        console.log('OCR Raw Text:', text.substring(0, 300));

        const result: any = {
            od: {},
            os: {},
            sourceType: 'Распознано по фото топографа (AI OCR)',
            rawText: text.substring(0, 500),
        };

        const isOs = fileNameLower.includes('os') || text.includes(' OS') || text.includes('OS ') || text.includes('Left') || text.includes('Левый');
        const eyeKey = isOs ? 'os' : 'od';

        // 1. Flat K (Fk / Km / Kf / K1 / SimK1)
        const fkMatch = text.match(/(?:Flat\s*K|Fk|Kf|Km|K1|Flat|SimK1|SimK\s*1|FlatK|K-flat|R1|r1)[^\d]*(\d{2}[.,]\d{1,3})/i);
        if (fkMatch) {
            const val = parseFloat(fkMatch[1].replace(',', '.'));
            if (val >= 34 && val <= 56) result[eyeKey].fk = val;
        }

        // 2. Steep K (Ks / Kr / K2 / SimK2)
        const ksMatch = text.match(/(?:Steep\s*K|Ks|Kr|K2|Steep|SimK2|SimK\s*2|SteepK|K-steep|R2|r2)[^\d]*(\d{2}[.,]\d{1,3})/i);
        if (ksMatch) {
            const val = parseFloat(ksMatch[1].replace(',', '.'));
            if (val >= 34 && val <= 56) result[eyeKey].ks = val;
        }

        // 3. Eccentricity Flat (ex / Em / Ecc flat / e1 / e)
        const exMatch = text.match(/(?:Ecc\s*flat|ex|e1|Em|Eccentricity|Eflat|e\s*flat|Ecc|e_x|e)[^\d]*(\d{1}[.,]\d{2,3})/i);
        if (exMatch) {
            const val = parseFloat(exMatch[1].replace(',', '.'));
            if (val >= 0.15 && val <= 0.95) result[eyeKey].ex = val;
        }

        // 4. HVID / W2W / Diameter
        const hvidMatch = text.match(/(?:HVID|W2W|White\s*to\s*White|Diam|WTW)[^\d]*(\d{2}[.,]\d{1,2})/i);
        if (hvidMatch) {
            const val = parseFloat(hvidMatch[1].replace(',', '.'));
            if (val >= 10.0 && val <= 13.5) result[eyeKey].hvid = val;
        }

        // 5. Smart Fallback for numeric topographer reports / maps
        // Extract all decimal numbers formatted like 42.50 or 42,50
        const normalizedText = text.replace(/,/g, '.');
        const kFloats = (normalizedText.match(/\b(3[5-9]\.\d{1,2}|4[0-9]\.\d{1,2}|5[0-5]\.\d{1,2})\b/g) || [])
            .map(v => parseFloat(v))
            .filter(v => v >= 35.0 && v <= 55.0);

        if (!result[eyeKey].fk && kFloats.length > 0) {
            kFloats.sort((a, b) => a - b);
            result[eyeKey].fk = kFloats[0];
            if (kFloats.length > 1 && !result[eyeKey].ks) {
                result[eyeKey].ks = kFloats[kFloats.length - 1];
            }
        }

        if (!result[eyeKey].ex) {
            const eFloats = (normalizedText.match(/\b(0\.[2-8]\d{1,2})\b/g) || [])
                .map(v => parseFloat(v))
                .filter(v => v >= 0.20 && v <= 0.85);
            if (eFloats.length > 0) {
                result[eyeKey].ex = eFloats[0];
            }
        }

        if (!result[eyeKey].hvid) {
            const hvidFloats = (normalizedText.match(/\b(1[0-2]\.[0-9]{1,2})\b/g) || [])
                .map(v => parseFloat(v))
                .filter(v => v >= 10.5 && v <= 13.0);
            if (hvidFloats.length > 0) {
                result[eyeKey].hvid = hvidFloats[0];
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('API /api/topography/parse-image error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process image' }, { status: 500 });
    }
}
