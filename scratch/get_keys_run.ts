import { OneCClient } from '../src/lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });

    try {
        console.log('--- Checking Items for Document 123 ---');
        const docs = await client.request<any>("Document_ТребованиеНакладная?$filter=Number eq '00000000123'");
        if (docs.value && docs.value.length > 0 && docs.value[0].Материалы) {
            for (const m of docs.value[0].Материалы) {
                const item = await client.request<any>(`Catalog_Номенклатура(guid'${m.Номенклатура_Key}')`);
                console.log(` - ${item.Description} (Key: ${m.Номенклатура_Key})`);
            }
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

main();
