import { Client } from 'pg';

const ordersToMap = [
  { id: 'AG20', company: 'Оптика Народная Астана' },
  { id: 'AG19', company: 'Оптика Народная Костанай' },
  { id: 'AG16', company: 'Оптика Народная Костанай' },
  { id: 'AG13', company: 'Оптика Народная Астана' },
  { id: 'AG12', company: 'Оптика Народная Астана' },
  { id: 'AG06', company: 'Оптика Народная Актобе' },
  { id: 'AF51', company: 'Оптика Народная Астана' },
  { id: 'AE49', company: 'Оптика Народная Астана' },
  { id: 'AD98', company: 'Оптика Народная Актобе' },
  { id: 'AD97', company: 'Оптика Народная Актобе' },
  { id: 'AD89', company: 'Оптика Народная Астана' },
  { id: 'AD68', company: 'Оптика Народная Астана' },
  { id: 'AD63', company: 'Оптика Народная Астана' },
  { id: 'AD62', company: 'Оптика Народная Астана' },
  { id: 'AC80', company: 'Оптика Народная Астана' },
  { id: 'AC79', company: 'Оптика Народная Астана' },
  { id: 'AC78', company: 'Оптика Народная Костанай' },
  { id: 'AC61', company: 'Оптика Народная' },
  { id: 'AC60', company: 'Оптика Народная' },
  { id: 'AC20', company: 'Оптика Народная' },
  { id: 'AC19', company: 'Оптика Народная' },
  { id: 'AB99', company: 'Оптика Народная' },
];

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.hxftfrjhkrybnazlmnol:Arnela645249@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const orderNumbers = ordersToMap.map(o => o.id);
  const { rows } = await client.query(`
    SELECT 
      o."orderNumber", 
      o."opticName" as "order_opticName",
      org."name" as "orgName",
      o."organizationId"
    FROM "orders" o
    LEFT JOIN "organizations" org ON o."organizationId" = org.id
    WHERE o."orderNumber" = ANY($1)
  `, [orderNumbers]);

  console.log('--- СРАВНЕНИЕ ДАННЫХ ---');
  let diffCount = 0;

  for (const expected of ordersToMap) {
    const dbOrder = rows.find(r => r.orderNumber === expected.id);
    if (!dbOrder) {
      console.log(`❌ Заказ ${expected.id}: Не найден в базе! (В таблице: ${expected.company})`);
      diffCount++;
      continue;
    }

    const dbCompany = dbOrder.orgName || dbOrder.order_opticName || 'Не указано';
    
    if (dbCompany.trim() !== expected.company.trim()) {
      console.log(`⚠️ Расхождение: ${expected.id}`);
      console.log(`  В таблице (картинка): ${expected.company}`);
      console.log(`  В базе Lens Flow   : ${dbCompany}`);
      diffCount++;
    } else {
      console.log(`✅ ${expected.id} совпадает (${dbCompany})`);
    }
  }

  console.log(`\nВсего найдено расхождений: ${diffCount}`);
  await client.end();
}

main().catch(console.error);
