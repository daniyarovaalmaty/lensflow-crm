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
                console.error('HEIC image conversion failed:', err);
            }
        }

        // Perform fast OCR on image buffer
        const worker = await createWorker('eng');
        await worker.setParameters({
            tessedit_char_whitelist: '0123456789.,-+abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:;=/() ',
        });
        const ret = await worker.recognize(buffer);
        await worker.terminate();

        const text = ret.data.text || '';

        const result: any = {
            od: {},
            os: {},
            sourceType: 'Распознано по фото топографа (AI OCR)',
            rawText: text.substring(0, 500),
        };

        const isOs = file.name.toLowerCase().includes('os') || text.includes(' OS') || text.includes('OS ') || text.includes('Left') || text.includes('Левый');
        const eyeKey = isOs ? 'os' : 'od';

        // 1. Flat K (Fk / Km / Kf / K1)
        const fkMatch = text.match(/(?:Flat\s*K|Fk|Kf|Km|K1|Flat|SimK1|SimK\s*1|FlatK|K-flat)[^\d]*(\d{2}[.,]\d{1,3})/i);
        if (fkMatch) {
            const val = parseFloat(fkMatch[1].replace(',', '.'));
            if (val >= 35 && val <= 55) result[eyeKey].fk = val;
        }

        // 2. Steep K (Ks / Kr / K2)
        const ksMatch = text.match(/(?:Steep\s*K|Ks|Kr|K2|Steep|SimK2|SimK\s*2|SteepK|K-steep)[^\d]*(\d{2}[.,]\d{1,3})/i);
        if (ksMatch) {
            const val = parseFloat(ksMatch[1].replace(',', '.'));
            if (val >= 35 && val <= 55) result[eyeKey].ks = val;
        }

        // 3. Eccentricity Flat (ex / Em / Ecc flat / e1)
        const exMatch = text.match(/(?:Ecc\s*flat|ex|e1|Em|Eccentricity|Eflat|e\s*flat|Ecc)[^\d]*(\d{1}[.,]\d{2,3})/i);
        if (exMatch) {
            const val = parseFloat(exMatch[1].replace(',', '.'));
            if (val >= 0.1 && val <= 0.95) result[eyeKey].ex = val;
        }

        // 4. HVID / W2W / Diameter
        const hvidMatch = text.match(/(?:HVID|W2W|White\s*to\s*White|Diam|WTW)[^\d]*(\d{2}[.,]\d{1,2})/i);
        if (hvidMatch) {
            const val = parseFloat(hvidMatch[1].replace(',', '.'));
            if (val >= 10.0 && val <= 13.5) result[eyeKey].hvid = val;
        }

        // Fallbacks: If numbers exist in text, search standalone floats
        if (!result[eyeKey].fk) {
            const standaloneK = text.match(/\b(3[6-9]\.\d{1,2}|4[0-9]\.\d{1,2}|5[0-4]\.\d{1,2})\b/g);
            if (standaloneK && standaloneK.length > 0) {
                const vals = standaloneK.map(v => parseFloat(v)).sort((a, b) => a - b);
                result[eyeKey].fk = vals[0];
                if (vals.length > 1) result[eyeKey].ks = vals[1];
            }
        }

        if (!result[eyeKey].ex) {
            const standaloneE = text.match(/\b(0\.[3-7]\d{1,2})\b/);
            if (standaloneE) {
                result[eyeKey].ex = parseFloat(standaloneE[1]);
            }
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('API /api/topography/parse-image error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process image' }, { status: 500 });
    }
}
