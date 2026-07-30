import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const url = 'https://1cstart.itsheff.cloud/okeyvizhenjb94v/odata/standard.odata/?$format=json';
    const user = 'Главный бухглатер';
    const pass = '5555';
    
    // Also try the correct spelling just in case
    const userCorrect = 'Главный бухгалтер';

    const auth1 = 'Basic ' + Buffer.from(user + ':' + pass, 'utf8').toString('base64');
    const auth2 = 'Basic ' + Buffer.from(userCorrect + ':' + pass, 'utf8').toString('base64');

    try {
        console.log('[OData Test] Trying auth 1 (бухглатер)...');
        let res = await fetch(url, {
            headers: { 'Authorization': auth1 }
        });

        let text = await res.text();

        if (res.status === 401 || res.status === 404) {
            console.log('[OData Test] Auth 1 failed or Not Found. Status:', res.status);
            console.log('[OData Test] Trying auth 2 (бухгалтер)...');
            res = await fetch(url, {
                headers: { 'Authorization': auth2 }
            });
            text = await res.text();
        }

        return NextResponse.json({
            status: res.status,
            statusText: res.statusText,
            urlTested: url,
            responsePreview: text.substring(0, 1000)
        });
    } catch (e: any) {
        return NextResponse.json({
            error: 'Fetch failed',
            details: e.message
        }, { status: 500 });
    }
}
