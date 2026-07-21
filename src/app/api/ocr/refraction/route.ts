import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Ensure the edge or node runtime can access env vars
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 30; // 30 seconds

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const prompt = `
    You are an expert optometrist assistant. I am providing an image of a refractometer receipt.
    Please extract the following data and return it as a pure JSON object (without markdown wrappers like \`\`\`json).
    Make sure to separate OD (Right Eye) and OS (Left Eye).
    Extract the following values for both OD and OS if present:
    - S (Sphere) as "sph"
    - C (Cylinder) as "cyl"
    - A (Axis) as "ax"
    - R1 as "r1"
    - R2 as "r2"
    - PD (Pupillary Distance) as "pd" (usually a single value for both eyes, or near/far). Give me "pdTotal" if available.

    If a value is not found, use null.
    Format the JSON strictly as:
    {
      "od": { "sph": number|null, "cyl": number|null, "ax": number|null, "r1": number|null, "r2": number|null },
      "os": { "sph": number|null, "cyl": number|null, "ax": number|null, "r1": number|null, "r2": number|null },
      "pdTotal": number|null
    }
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
                url: dataUrl,
                detail: "high"
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    let rawJson = response.choices[0]?.message?.content || '{}';
    // Remove markdown code blocks if the model still outputs them
    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(rawJson);
    
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
