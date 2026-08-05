import { OneCClient } from '../src/lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });

    try {
        const res = await client.request<any>('Catalog_Номенклатура?$filter=Description eq \'Линзы контактные жесткие корригирующие OKV - RGP пробная. DK 50\'');
        console.log('Search result:', res.value);
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

main();
