import { OneCClient } from './lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });
    try {
        const contracts = await client.request<any>('Catalog_ДоговорыКонтрагентов?$top=1');
        console.log(JSON.stringify(contracts.value[0], null, 2));
    } catch (e: any) {
        console.error(e.message);
    }
}
main();
