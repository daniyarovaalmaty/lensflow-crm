import { OneCClient } from './lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });

    try {
        console.log('Fetching ALL Price Types...');
        const priceTypes = await client.request<any>('Catalog_ТипыЦенНоменклатуры');
        priceTypes.value.forEach((pt: any) => {
            console.log(`- ${pt.Description} (${pt.Ref_Key})`);
        });
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

main();
