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

        // Method 1: OpenAI GPT-4o-mini Vision API (Exact Tomey Topographer OCR Prompt)
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
                                        text: `You are an expert corneal topography OCR system. Analyze this topographer screen photo (Tomey 22C-200S, Medmont, Antares, Pentacam, Keratron).

CRITICAL EYE DETECTION RULE:
- Look for markers like "OD", "Right", "R", "Правый" -> detectedEye: "OD" (Leave "os": {})
- Look for markers like "OS", "Left", "L", "Левый" -> detectedEye: "OS" (Leave "od": {})
- If both eyes are shown -> detectedEye: "BOTH"

CRITICAL PARAMETER EXTRACTION RULES:
1. Flat K (fk):
   - Look for "Kf:", "Fk:", "Km:", "K1:", "Flat K:", "Kflat:".
   - Example from Tomey screen: "Kf: 43.47 @ 180°" -> fk = 43.47.
2. Steep K (ks):
   - Look for "Ks:", "Kr:", "K2:", "Steep K:", "Ksteep:".
   - Example from Tomey screen: "Ks: 44.90 @ 90°" -> ks = 44.90 (Do NOT confuse with Kf!).
3. Flat Ex (ex):
   - Look for "Em:" (Mean/Flat eccentricity) or "ex:" or "e1:".
   - Example from Tomey screen: "Es: 0.81 / Em: 0.66" -> ex MUST BE 0.66 (Em is Flat Ex! Do NOT pick Es=0.81!).

Return STRICT RAW JSON only (no markdown, no codeblock):
{
  "detectedEye": "OD", 
  "od": { "fk": 43.47, "ks": 44.90, "ex": 0.66 },
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

        // Flat K (Kf / Fk / Km / K1)
        const fkMatches = [...normalizedText.matchAll(/(?:Kf|Fk|Km|K1|Flat\s*K|Flat|SimK1|R1|r1|Флат|К1)[^\d]*(\d{2}\.\d{1,3})/gi)];
        if (fkMatches.length > 0) {
            const v = parseKVal(fkMatches[0][1]);
            if (v) targetEye.fk = v;
        }

        // Steep K (Ks / Kr / K2)
        const ksMatches = [...normalizedText.matchAll(/(?:Ks|Kr|K2|Steep\s*K|Steep|SimK2|R2|r2|Стип|К2)[^\d]*(\d{2}\.\d{1,3})/gi)];
        if (ksMatches.length > 0) {
            const v = parseKVal(ksMatches[0][1]);
            if (v) targetEye.ks = v;
        }

        // Flat Ex (Em / em / ex / e1)
        const emMatches = [...normalizedText.matchAll(/(?:Em|em|ex|e1|Ecc\s*flat|e_x|e\b|экс)[^\d]*(\d{1}\.\d{2,3})/gi)];
        if (emMatches.length > 0) {
            const v = parseFloat(emMatches[0][1]);
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
