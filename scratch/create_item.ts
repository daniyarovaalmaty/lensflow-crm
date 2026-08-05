import { OneCClient } from '../src/lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });

    try {
        console.log('--- Cloning nomenclature ---');
        const res = await client.request<any>('Catalog_Номенклатура');
        const allItems = res.value || [];
        
        const template = allItems.find((i: any) => i.Description === 'Пробная Линзы КЖК OKV-RGP пробная DK 50');
        if (!template) {
            console.log('Template not found');
            return;
        }

        console.log('Found template:', template.Ref_Key);
        
        // Let's create the new item
        const newItem = {
            ...template,
            Description: 'Линзы контактные жесткие корригирующие OKV - RGP пробная. DK 50'
        };
        
        // Remove keys that cannot be posted
        delete newItem.Ref_Key;
        delete newItem.DataVersion;
        delete newItem['odata.etag'];
        delete newItem.Code; // <--- This is the fix
        
        const createRes = await client.request<any>('Catalog_Номенклатура', {
            method: 'POST',
            body: JSON.stringify(newItem)
        });
        
        console.log('Successfully created clone!', createRes.Ref_Key);
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

main();
