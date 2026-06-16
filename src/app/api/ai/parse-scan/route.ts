import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { image } = body;

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const prompt = `
You are an expert ophthalmologist AI. Extract optical and topography parameters from the provided scan image (autorefractor, topographer, or prescription).
Return ONLY a raw JSON object with the following structure (do not use markdown blocks like \`\`\`json):
{
  "type": "prescription" | "consultation", // "prescription" if it's mostly glasses Rx, "consultation" if it's topography/autorefractometry
  "data": {
    "odSph": number | null,
    "odCyl": number | null,
    "odAx": number | null,
    "odAdd": number | null,
    "odPd": number | null,
    "osSph": number | null,
    "osCyl": number | null,
    "osAx": number | null,
    "osAdd": number | null,
    "osPd": number | null,
    "pdTotal": number | null,
    
    // Topography & Consultation fields
    "visualAcuityOD": number | null,
    "visualAcuityOS": number | null,
    "intraocularPressureOD": number | null,
    "intraocularPressureOS": number | null,
    
    "k1OD": number | null,
    "k2OD": number | null,
    "axisOD": number | null,
    "astigmatismOD": number | null,
    "pachymetryOD": number | null,
    "eccentricityOD": number | null,
    
    "k1OS": number | null,
    "k2OS": number | null,
    "axisOS": number | null,
    "astigmatismOS": number | null,
    "pachymetryOS": number | null,
    "eccentricityOS": number | null
  }
}
If a value is not found or unreadable, set it to null. Ensure numbers are properly parsed.
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: image, // expected to be a base64 data URI e.g., data:image/jpeg;base64,...
                            },
                        },
                    ],
                },
            ],
            max_tokens: 1000,
        });

        const textResponse = response.choices[0]?.message?.content || '{}';
        
        // Clean markdown backticks if OpenAI added them despite instructions
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedData = JSON.parse(cleanJson);

        return NextResponse.json(parsedData);

    } catch (error: any) {
        console.error('Error parsing scan:', error);
        return NextResponse.json({ error: error.message || 'Failed to parse image' }, { status: 500 });
    }
}
