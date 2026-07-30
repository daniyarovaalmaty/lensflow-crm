import { OneCClient } from './lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });

    try {
        console.log('Fetching metadata...');
        const res = await fetch('https://1cstart.itsheff.cloud/okeyvizhenjb94v/odata/standard.odata/$metadata', {
            headers: {
                'Authorization': 'Basic ' + Buffer.from('Главный бухгалтер:5555', 'utf8').toString('base64')
            }
        });
        const text = await res.text();
        console.log("Metadata length:", text.length);
        const matches = text.match(/<EntitySet\s+Name="([^"]+)"/g);
        if (matches) {
            const names = matches.map((m: string) => m.match(/Name="([^"]+)"/)![1]);
            const filtered = names.filter(n => n.includes('СчетНаОплату') || n.includes('Цен'));
            console.log("Found relevant EntitySets:", filtered);
        } else {
            console.log("No EntitySets found");
        }
    } catch (e: any) {
        console.error('Error fetching metadata:', e.message);
    }
}

main();
