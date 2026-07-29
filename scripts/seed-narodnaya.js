const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = process.env.NARODNAYA_DB_URL;
const pool = new pg.Pool({ connectionString, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const stores = [
  // Астана
  { id: 'nar-astana-respubliki', name: 'Республики 25 (Правый берег)', city: 'Астана', parentId: 'narodnaya-astana', type: 'branch', itigrisId: 1000000006, itigrisType: 'STORE' },
  { id: 'nar-astana-turkestan', name: 'Туркестан 10 (Левый берег)', city: 'Астана', parentId: 'narodnaya-astana', type: 'branch', itigrisId: 1000000015, itigrisType: 'STORE' },
  { id: 'nar-astana-momyshuly', name: 'Момышулы 4', city: 'Астана', parentId: 'narodnaya-astana', type: 'branch', itigrisId: 1000000018, itigrisType: 'STORE' },
  { id: 'nar-astana-sklad', name: 'Склад Астана', city: 'Астана', parentId: 'narodnaya-astana', type: 'branch', itigrisId: 1000000007, itigrisType: 'DEPOT' },

  // Актобе
  { id: 'nar-aktobe-nokina', name: 'Анвар К.Нокина 34Б', city: 'Актобе', parentId: 'narodnaya-aktobe', type: 'branch', itigrisId: 1000000010, itigrisType: 'STORE' },
  { id: 'nar-aktobe-akaciya', name: 'Акация Уалиханова 14', city: 'Актобе', parentId: 'narodnaya-aktobe', type: 'branch', itigrisId: 1000000013, itigrisType: 'STORE' },
  { id: 'nar-aktobe-hlebokombinat', name: 'Бр Жубановых 306', city: 'Актобе', parentId: 'narodnaya-aktobe', type: 'branch', itigrisId: 1000000014, itigrisType: 'STORE' },
  { id: 'nar-aktobe-batys', name: 'Батыс Тауелсиздик 13 к3', city: 'Актобе', parentId: 'narodnaya-aktobe', type: 'branch', itigrisId: 1000000019, itigrisType: 'STORE' },
  { id: 'nar-aktobe-shaikenova', name: 'Шайкенова 13а (11 мкр)', city: 'Актобе', parentId: 'narodnaya-aktobe', type: 'branch', itigrisId: 1000000021, itigrisType: 'STORE' },
  { id: 'nar-aktobe-kendala', name: 'Кендала Бокенбай Батыра д2', city: 'Актобе', parentId: 'narodnaya-aktobe', type: 'branch', itigrisId: 1000000022, itigrisType: 'STORE' },
  { id: 'nar-aktobe-elektron', name: 'Электрон Абулхаир Хана 27', city: 'Актобе', parentId: 'narodnaya-aktobe', type: 'branch', itigrisId: 1000000023, itigrisType: 'STORE' },
  { id: 'nar-aktobe-sklad', name: 'Склад Актобе', city: 'Актобе', parentId: 'narodnaya-aktobe', type: 'branch', itigrisId: 1000000009, itigrisType: 'DEPOT' },

  // Костанай
  { id: 'nar-kostanay-tenter', name: 'Тауелсиздик 37 Центр', city: 'Костанай', parentId: 'narodnaya-kostanay', type: 'branch', itigrisId: 1000000004, itigrisType: 'STORE' },
  { id: 'nar-kostanay-9mkr', name: '9 микрорайон', city: 'Костанай', parentId: 'narodnaya-kostanay', type: 'branch', itigrisId: 1000000012, itigrisType: 'STORE' },
  { id: 'nar-kostanay-abaya', name: 'Абая 123 Жана кала', city: 'Костанай', parentId: 'narodnaya-kostanay', type: 'branch', itigrisId: 1000000017, itigrisType: 'STORE' },
  { id: 'nar-kostanay-bazar', name: 'Базар Алтынсарина 160', city: 'Костанай', parentId: 'narodnaya-kostanay', type: 'branch', itigrisId: 1000000024, itigrisType: 'STORE' },
  { id: 'nar-kostanay-sklad', name: 'Склад Костанай', city: 'Костанай', parentId: 'narodnaya-kostanay', type: 'branch', itigrisId: 1000000003, itigrisType: 'DEPOT' },
  { id: 'nar-kostanay-ceh', name: 'Цех Костанай', city: 'Костанай', parentId: 'narodnaya-kostanay', type: 'branch', itigrisId: 1000000005, itigrisType: 'PRODUCTION' },

  // Рудный
  { id: 'nar-rudny-korchagina', name: 'Корчагина 94а (Бак Бак)', city: 'Рудный', parentId: 'narodnaya-kostanay', type: 'branch', itigrisId: 1000000016, itigrisType: 'STORE' },

  // Центральный офис
  { id: 'nar-central-office', name: 'Центральный офис', city: 'Костанай', parentId: 'narodnaya-hq', type: 'branch', itigrisId: 1000000001, itigrisType: 'OFFICE' },
];

async function seed() {
  console.log('🏗️  Creating all 21 store locations...\n');

  for (const s of stores) {
    const org = await prisma.organization.upsert({
      where: { id: s.id },
      update: { metadata: { itigris: { departmentId: s.itigrisId, type: s.itigrisType } } },
      create: {
        id: s.id,
        name: s.name,
        type: s.type,
        status: 'active',
        city: s.city,
        parentId: s.parentId,
        metadata: { itigris: { departmentId: s.itigrisId, type: s.itigrisType } },
      },
    });
    const icon = s.itigrisType === 'STORE' ? '🏪' : s.itigrisType === 'DEPOT' ? '📦' : s.itigrisType === 'PRODUCTION' ? '🏭' : '🏢';
    console.log(`  ${icon} ${org.city.padEnd(12)} ${org.name}`);
  }

  console.log(`\n✅ Создано ${stores.length} точек!`);
  
  // Print tree
  console.log('\n📊 Структура:');
  console.log('ТОО "Оптика Народная" (HQ)');
  const cities = { 'narodnaya-astana': 'Астана', 'narodnaya-aktobe': 'Актобе', 'narodnaya-kostanay': 'Костанай' };
  for (const [cityId, cityName] of Object.entries(cities)) {
    const cityStores = stores.filter(s => s.parentId === cityId);
    console.log(`├── ${cityName} (${cityStores.length} точек)`);
    cityStores.forEach((s, i) => {
      const prefix = i === cityStores.length - 1 ? '│   └──' : '│   ├──';
      console.log(`${prefix} ${s.name}`);
    });
  }
}

seed()
  .catch(e => { console.error('❌', e.message || e); process.exit(1); })
  .finally(() => { pool.end(); prisma.$disconnect(); });
