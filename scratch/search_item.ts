import { OneCClient } from '../src/lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });

    try {
        console.log('--- Searching for items containing "RGP" or "OKV" ---');
        // Let's get all items and filter in code to avoid OData syntax issues with substringof
        const res = await client.request<any>('Catalog_Номенклатура');
        const allItems = res.value || [];
        
        const matches = allItems.filter((i: any) => 
            i.Description.toLowerCase().includes('rgp') ||
            i.Description.toLowerCase().includes('okv') ||
            i.Description.toLowerCase().includes('dk 50')
        );

        console.log(`Found ${matches.length} matching items:`);
        matches.forEach((m: any) => {
            console.log(`- ${m.Description}`);
        });

    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

main();
