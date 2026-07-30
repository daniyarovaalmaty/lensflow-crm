import { OneCClient } from './lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });
    try {
        const cps = await client.request<any>('Catalog_Контрагенты?$top=1');
        console.log(JSON.stringify(cps.value[0], null, 2));
    } catch (e: any) {
        console.error(e.message);
    }
}
main();
