import { OneCClient } from './lib/onec/client';

async function main() {
    const client = new OneCClient({
        baseUrl: 'https://1cstart.itsheff.cloud/okeyvizhenjb94v',
        username: 'Главный бухгалтер',
        password: '5555'
    });
    try {
        const enums = await client.request<any>('Enum_ЮрФизЛицо');
        console.log(JSON.stringify(enums, null, 2));
    } catch (e: any) {
        console.error(e.message);
    }
}
main();
