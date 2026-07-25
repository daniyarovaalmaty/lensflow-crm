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

        // Method 1: OpenAI GPT-4o-mini Vision API (Explicit OD / OS Eye Detection)
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

CRITICAL STEP 1: Determine which eye is depicted on this photo:
- Look for markers like "OD", "Right", "R", "Правый", "Пр" -> detectedEye: "OD"
- Look for markers like "OS", "Left", "L", "Левый", "Лев" -> detectedEye: "OS"
- If both eyes are shown -> detectedEye: "BOTH"

CRITICAL STEP 2: Extract numeric values for the detected eye(s):
- Flat K (Fk / K1 in Diopters D, 35.0-55.0. If given in mm like 7.94mm, convert to D: K = 337.5 / R)
- Steep K (Ks / K2 in Diopters D, 35.0-55.0)
- Flat Ex (eccentricity ex / e1 / e, range 0.20-0.85)

Return STRICT RAW JSON only (no markdown, no codeblock):
{
  "detectedEye": "OD", 
  "od": { "fk": 42.50, "ks": 43.75, "ex": 0.52 },
  "os": {}
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

                    const detectedEye = parsedJson.detectedEye || 'OD';
                    let od = parsedJson.od || {};
                    let os = parsedJson.os || {};

                    if (detectedEye === 'OD') {
                        os = {};
                    } else if (detectedEye === 'OS') {
                        od = {};
                    } else if (detectedEye === 'BOTH' && !os.fk && od.fk) {
                        os = { ...od };
                    }

                    return NextResponse.json({
                        detectedEye,
                        od,
                        os,
                        sourceType: `Распознано ИИ (GPT-4o Vision: ${detectedEye === 'OD' ? 'Правый глаз OD' : (detectedEye === 'OS' ? 'Левый глаз OS' : 'Оба глаза')})`,
                        rawFileName: file.name,
                    });
                }
            } catch (aiErr) {
                console.error('OpenAI Vision parsing error:', aiErr);
            }
        }

        // Method 2: Fallback Heuristic Regex Parser if AI API fails
        const text = buffer.toString('utf-8');
        const normalizedText = text.replace(/,/g, '.');

        const isOsText = fileNameLower.includes('os') || normalizedText.includes(' OS') || normalizedText.includes('OS ') || normalizedText.includes('Left') || normalizedText.includes('Левый');
        const detectedEye = isOsText ? 'OS' : 'OD';

        const od: any = {};
        const os: any = {};
        const targetEye = isOsText ? os : od;

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
            if (v) targetEye.fk = v;
        }

        const ksMatches = [...normalizedText.matchAll(/(?:Steep\s*K|Ks|Kr|K2|Steep|SimK2|R2|r2|Стип|К2)[^\d]*(\d{1,2}\.\d{1,3})/gi)];
        if (ksMatches.length > 0) {
            const v = parseKVal(ksMatches[0][1]);
            if (v) targetEye.ks = v;
        }

        const exMatches = [...normalizedText.matchAll(/(?:Ecc\s*flat|ex|e1|Em|Eccentricity|e_x|e\b|экс)[^\d]*(\d{1}\.\d{2,3})/gi)];
        if (exMatches.length > 0) {
            const v = parseFloat(exMatches[0][1]);
            if (v >= 0.15 && v <= 0.95) targetEye.ex = v;
        }

        return NextResponse.json({
            detectedEye,
            od,
            os,
            sourceType: `Распознано по фото (${detectedEye === 'OS' ? 'Левый глаз OS' : 'Правый глаз OD'})`,
            rawFileName: file.name,
        });
    } catch (error: any) {
        console.error('API /api/topography/parse-image error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process image' }, { status: 500 });
    }
}
