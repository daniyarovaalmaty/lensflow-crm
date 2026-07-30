import { OneCClient } from './lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });

    try {
        console.log('1. Searching for Counterparty...');
        let cpKey = null;
        const searchRes = await client.request<any>(`Catalog_Контрагенты?$filter=Description eq 'ТЕСТОВАЯ ОПТИКА LENSFLOW'`);
        if (searchRes.value && searchRes.value.length > 0) {
            cpKey = searchRes.value[0].Ref_Key;
            console.log('Found existing Counterparty:', cpKey);
        } else {
            console.log('Not found, creating new...');
            const newCp = await client.createCounterparty({ name: 'ТЕСТОВАЯ ОПТИКА LENSFLOW', type: 'ЮридическоеЛицо' });
            cpKey = newCp.Ref_Key;
            console.log('Created Counterparty:', cpKey);
        }

        console.log('2. Fetching Currency KZT...');
        const curr = await client.request<any>(`Catalog_Валюты?$filter=Description eq 'KZT' or Description eq 'тнг' or Code eq '398'`);
        const currKey = curr.value?.[0]?.Ref_Key || '00000000-0000-0000-0000-000000000000';

        console.log('3. Searching/Creating Contract...');
        const contracts = await client.request<any>(`Catalog_ДоговорыКонтрагентов?$filter=Owner_Key eq guid'${cpKey}'`);
        let contractKey = null;
        if (contracts.value && contracts.value.length > 0) {
            contractKey = contracts.value[0].Ref_Key;
            console.log('Found existing Contract:', contractKey);
        } else {
            const newContract = await client.createContract(cpKey, 'd0455782-d295-11e5-bf5f-001a4d5d6b30', currKey);
            contractKey = newContract.Ref_Key;
            console.log('Created Contract:', contractKey);
        }

        console.log('4. Fetching one product for test...');
        const prods = await client.request<any>('Catalog_Номенклатура?$top=1');
        const prodKey = prods.value[0].Ref_Key;

        console.log('5. Creating Payment Bill...');
        const bill = await client.createPaymentBill({
            date: new Date().toISOString().split('.')[0],
            organizationKey: 'd0455782-d295-11e5-bf5f-001a4d5d6b30',
            warehouseKey: 'dce00a7e-e103-11ee-8d2e-00074335e838',
            counterpartyKey: cpKey,
            contractKey: contractKey,
            items: [
                { productKey: prodKey, quantity: 1, price: 1000 }
            ]
        });
        console.log('Created Payment Bill:', bill.Ref_Key);

        console.log('6. Creating Sales Invoice...');
        const invoice = await client.createSalesInvoice({
            date: new Date().toISOString().split('.')[0],
            organizationKey: 'd0455782-d295-11e5-bf5f-001a4d5d6b30',
            warehouseKey: 'dce00a7e-e103-11ee-8d2e-00074335e838',
            counterpartyKey: cpKey,
            contractKey: contractKey,
            items: [
                { productKey: prodKey, quantity: 1, price: 1000 }
            ]
        });
        console.log('Created Sales Invoice:', invoice.Ref_Key);
        console.log('SUCCESS! Everything works.');
    } catch (e: any) {
        console.error('TEST FAILED:', e.message);
    }
}

main();
