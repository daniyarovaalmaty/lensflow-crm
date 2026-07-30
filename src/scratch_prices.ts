import { OneCClient } from './lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });

    try {
        console.log('Fetching Price Types...');
        const priceTypes = await client.request<any>('Catalog_ТипыЦенНоменклатуры?$top=2');
        console.log("Price Types:", JSON.stringify(priceTypes, null, 2));

        console.log('Fetching Prices...');
        const prices = await client.request<any>('InformationRegister_ЦеныНоменклатуры?$top=2');
        console.log("Prices:", JSON.stringify(prices, null, 2));

    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

main();
