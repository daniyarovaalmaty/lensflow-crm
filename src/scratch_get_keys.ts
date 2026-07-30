import { OneCClient } from './lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });

    try {
        console.log('--- Organizations ---');
        const orgs = await client.request<any>('Catalog_Организации?$top=2');
        orgs.value.forEach((o: any) => console.log(`${o.Description} : ${o.Ref_Key}`));

        console.log('\n--- Warehouses ---');
        const stores = await client.request<any>('Catalog_Склады?$top=2');
        stores.value.forEach((s: any) => console.log(`${s.Description} : ${s.Ref_Key}`));

        console.log('\n--- Currencies ---');
        const currencies = await client.request<any>('Catalog_Валюты?$top=1');
        currencies.value.forEach((c: any) => console.log(`${c.Description} : ${c.Ref_Key}`));

    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

main();
