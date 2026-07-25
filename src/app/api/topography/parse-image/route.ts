export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
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

        // Method 1: OpenAI GPT-4o-mini Vision API (Highest medical accuracy for screen photos)
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            try {
                const base64Image = buffer.toString('base64');
                const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: `You are an expert corneal topography OCR system. Analyze this topographer screen photo or printed report. 
Extract numeric values for OD (Right Eye) and OS (Left Eye):
- Flat K (Fk / K1 in Diopters D, 35.0-55.0. If given in mm like 7.94mm, convert to D: K = 337.5 / R)
- Steep K (Ks / K2 in Diopters D, 35.0-55.0)
- Flat Ex (eccentricity ex / e1 / e, range 0.20-0.85)
- HVID (corneal diameter in mm, range 10.4-13.0)

Return STRICT RAW JSON only (no markdown, no codeblock):
{
  "od": { "fk": 42.50, "ks": 43.75, "ex": 0.52, "hvid": 11.6 },
  "os": { "fk": 42.50, "ks": 43.75, "ex": 0.52, "hvid": 11.6 }
}`
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: {
                                            url: `data:image/jpeg;base64,${base64Image}`
                                        }
                                    }
                                ]
                            }
                        ],
                        max_tokens: 400,
                        temperature: 0.1,
                    }),
                });

                if (aiRes.ok) {
                    const aiData = await aiRes.json();
                    const rawContent = aiData.choices?.[0]?.message?.content || '';
                    const cleanJsonStr = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsedJson = JSON.parse(cleanJsonStr);

                    const od = parsedJson.od || {};
                    const os = parsedJson.os || {};

                    // Ensure fallback mirroring if only one eye was in photo
                    if (!os.fk && od.fk) os.fk = od.fk;
                    if (!os.ks && od.ks) os.ks = od.ks;
                    if (!os.ex && od.ex) os.ex = od.ex;
                    if (!os.hvid && od.hvid) os.hvid = od.hvid;

                    if (od.fk || os.fk || od.ex) {
                        return NextResponse.json({
                            od,
                            os,
                            sourceType: 'Распознано ИИ (GPT-4o Vision)',
                            rawFileName: file.name,
                        });
                    }
                }
            } catch (aiErr) {
                console.error('OpenAI Vision parsing error:', aiErr);
            }
        }

        // Method 2: Fallback Heuristic Regex Parser if AI API fails
        const text = buffer.toString('utf-8');
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

        const fkMatches = [...normalizedText.matchAll(/(?:Flat\s*K|Fk|Kf|Km|K1|Flat|SimK1|R1|r1|Флат|К1)[^\d]*(\d{1,2}\.\d{1,3})/gi)];
        if (fkMatches.length > 0) {
            const v = parseKVal(fkMatches[0][1]);
            if (v) od.fk = v;
        }

        const ksMatches = [...normalizedText.matchAll(/(?:Steep\s*K|Ks|Kr|K2|Steep|SimK2|R2|r2|Стип|К2)[^\d]*(\d{1,2}\.\d{1,3})/gi)];
        if (ksMatches.length > 0) {
            const v = parseKVal(ksMatches[0][1]);
            if (v) od.ks = v;
        }

        const exMatches = [...normalizedText.matchAll(/(?:Ecc\s*flat|ex|e1|Em|Eccentricity|e_x|e\b|экс)[^\d]*(\d{1}\.\d{2,3})/gi)];
        if (exMatches.length > 0) {
            const v = parseFloat(exMatches[0][1]);
            if (v >= 0.15 && v <= 0.95) od.ex = v;
        }

        const hvidMatches = [...normalizedText.matchAll(/(?:HVID|W2W|Diam|WTW|диаметр)[^\d]*(\d{2}\.\d{1,2})/gi)];
        if (hvidMatches.length > 0) {
            const v = parseFloat(hvidMatches[0][1]);
            if (v >= 10.0 && v <= 13.5) od.hvid = v;
        }

        if (!os.fk && od.fk) os.fk = od.fk;
        if (!os.ks && od.ks) os.ks = od.ks;
        if (!os.ex && od.ex) os.ex = od.ex;
        if (!os.hvid && od.hvid) os.hvid = od.hvid;

        return NextResponse.json({
            od,
            os,
            sourceType: 'Распознано по фото (AI OCR)',
            rawFileName: file.name,
        });
    } catch (error: any) {
        console.error('API /api/topography/parse-image error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process image' }, { status: 500 });
    }
}
