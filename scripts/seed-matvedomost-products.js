// Script to seed 99 products from matvedomost into the database
// Run with: node scripts/seed-matvedomost-products.js

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // Find organization by user email
    const user = await prisma.user.findUnique({
        where: { email: 'medinnovation.kaz2021@gmail.com' },
        select: { organizationId: true, organization: { select: { name: true } } }
    });
    
    if (!user?.organizationId) {
        console.error('User or organization not found!');
        process.exit(1);
    }

    const orgId = user.organizationId;
    console.log(`Using organization: ${user.organization?.name} (${orgId})\n`);

    // Products from матведомость на 19062026 (2).xlsx
    // Each entry: [name, category, purchasePrice, trackSerials]
    const products = [
        // Клей и расходники для протезирования
        ["B-200-R КЛЕЙ FACTOR II DARO REGULAR, (СТАНДАРТНЫЙ) 60г. ДЛЯ ПАССИВНОГО ПРОТЕЗИРОВАНИЯ", "consumable", 23652.16, false],
        ["Betasil Vario Набор №015318", "consumable", 30000, false],
        
        // Хирургические инструменты
        ["BILCALHO GUIDE", "instrument", 29645.25, false],
        ["CUCHILLETE DIAMANTE ANILLOS FERRARA (120.015.088)", "instrument", 592905, false],
        ["DOUBLE OPTICAL ZONE MARKER 5mm", "instrument", 83006.7, false],
        
        // Диагностические линзы VOLK
        ["G-6MIRROR NF LARGE RING W/CASE/ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 177829.61, true],
        
        // Инструмент
        ["KREMER FIXATION FORCEPS", "instrument", 90912.1, false],
        
        // Импланты (без остатков)
        ["oculfit spheres without registration", "implant", 0, false],
        
        // Инструменты
        ["PREDELAMINADOR", "instrument", 23716.2, false],
        ["SUAREZ SPREADER", "instrument", 31621.6, false],
        
        // Диагностические линзы VOLK
        ["V28LC ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 150296.84, true],
        ["V3MIRANF+ ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 201396.87, true],
        ["V78C ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 159183.51, true],
        ["V78C-CC ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 154891.03, true],
        ["V78C-GN ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 152460.47, true],
        ["V78C-PE ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 152460.47, true],
        ["V78С-SR ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 152460.47, true],
        ["V90C ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 162104.11, true],
        ["V90C-SR ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 174708.79, true],
        ["V90С-RD ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 152460.47, true],
        ["VAC ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 0, true],
        ["VCAPS ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 245034.12, true],
        ["VDGTLHM ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 189393.89, true],
        ["VDGTLWF ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 226114.31, true],
        ["VDGTLWF-BK ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 226095.46, true],
        ["VDGTLWF-GD ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 226095.46, true],
        ["VDGTLWF-RD ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 226095.46, true],
        ["VG3 ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 224550.67, true],
        ["VIRID ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 283069.74, true],
        
        // Хирургические наборы
        ["VS 302 Набор Фибрин", "surgical_kit", 302173.54, false],
        ["VS 323 Набор Эндоскопический Фибрин", "surgical_kit", 315676.24, false],
        
        // Диагностические линзы
        ["VSQUAD160 ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 389064.08, true],
        
        // Расходники
        ["Zetaplus System компл №023017", "consumable", 12600, false],
        
        // ИОЛ
        ["Асферичная интраокулярная стерильная гидрофобная линза AIALA DRY модель LLASHP60", "iol", 13205.72, true],
        
        // Другое
        ["Бензин АИ-95", "other", 275.66, false],
        
        // Оборудование
        ["Бесконтактный тонометр Pulsair, модель Desktop", "equipment", 3250000, true],
        ["Бормашина БМ 2.0 ЭКО ОПТИМУМ АВЕРОН", "equipment", 224000, true],
        ["Бормашина БМ 2.0 ЭКО ПРОФИ АВЕРОН", "equipment", 246000, true],
        
        // Вискоэластики
        ["Вязкоэластичный интраокулярный раствор AJL VISC 1.4% Sodium Hyaluronate", "viscoelastic", 0, false],
        ["Вязкоэластичный интраокулярный раствор AJL VISC 2% Sodium Hyaluronate", "viscoelastic", 5452.56, false],
        ["Вязкоэластичный интраокулярный раствор AJL VISC 3% Sodium Hyaluronate", "viscoelastic", 5849.25, false],
        ["Вязкоэластичный интроакулярный раствор AJL CELL 2%HPMC", "viscoelastic", 3906.01, false],
        ["Вязкоэластичный интроакулярный раствор AJL VISC 2% Sodium Hyaluronate серия 00B01105 до 05/2022", "viscoelastic", 0, false],
        
        // Диагностические линзы (общий)
        ["ДИАГНОСТИЧЕСКИЕ ЛИНЗЫ VOLK MEDICAL LENSES FOR INDIRECT OPHTALMOSCOPY", "diagnostic_lens", 175015.46, true],
        
        // Расходники
        ["Диспенсеры пластиковые- Dental dispensing gun (1:1) (Регистрация не требуется) 12%", "consumable", 11000, false],
        
        // Дренажи
        ["Дренаж антиглаукоматозный \"Глаутекс\" модель TDA (nanoArgentum)", "drainage", 0, false],
        ["Дренаж антиглаукоматозный резорбируемый «Глаутекс®» по ТУ 9398-002-95175363-2010, модель TDA", "drainage", 121783.92, false],
        
        // Оборудование
        ["Жидкокристаллическая таблица для проверки остроты зрения С-901", "equipment", 770000, true],
        
        // ИОЛ HOYA
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA ISERT 150", "iol", 17761.63, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA ISERT 151", "iol", 19211.72, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA ISERT 250", "iol", 14544.96, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA ISERT 251", "iol", 14541.8, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA ISERT 254", "iol", 18316.97, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA ISERT 255", "iol", 23999.1, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA NANEX™ MULTISERT+™ NY1-SP", "iol", 31251.55, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA VIVINEX MULTISERT XC1-SP", "iol", 37095.27, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA VIVINEX MULTISERT XY1-SP", "iol", 40308, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA VIVINEX TORIC MULTISERT XY1AT2-SP", "iol", 45715.01, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA VIVINEX TORIC MULTISERT XY1AT3-SP", "iol", 49176.86, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA VIVINEX TORIC MULTISERT XY1AT4-SP", "iol", 48217.32, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA VIVINEX TORIC MULTISERT XY1AT5-SP", "iol", 42713.7, true],
        ["ИНТРАОКУЛЯРНАЯ ЛИНЗА HOYA VIVINEX TORIC MULTISERT XY1AT6-SP", "iol", 41047.89, true],
        
        // Роговичные кольца
        ["ИНТРАСТРОМАЛЬНЫЙ СЕГМЕНТ РОГОВИЧНОГО КОЛЬЦА AJL RING", "corneal_ring", 76795.15, true],
        
        // Хирургические наборы
        ["Комплект для хирургии заднего отрезка ТOTAL PLUS VIT PAK.  и комб.хирургии ТOTAL PLUS COMB PROC PAK", "surgical_kit", 125000, false],
        
        // Импланты
        ["Конформер", "implant", 8153.96, false],
        
        // Оборудование
        ["ЛАМПА ДЛЯ ПРОВЕДЕНИЯ УФ-КРОССЛИНКИНГА РОГОВИЧНОГО КОЛЛАГЕНА", "equipment", 7290976, true],
        
        // ИОЛ
        ["Линза интраокул. склад. акриловая асферич. заднекамерная 677 ADY (Bi-Flex ) с голубым фильтром произ", "iol", 32000, true],
        ["Линза интраокулярная модель LLASHP60-PL", "iol", 0, true],
        
        // Контактные линзы
        ["Линза контактная жесткая газопроницаемая для ортокератологии MoonLenzTM, индивидуальная", "contact_lens", 0, true],
        
        // Расходники
        ["Маски одноразовые (голубая)  №023173", "consumable", 13, false],
        
        // Инструменты/оборудование
        ["Набор из двух грузиков металлических для определения внутриглазного давления по Маклакову НГм2-«ОФТ-", "instrument", 55715, false],
        ["Набор пробных линз", "surgical_kit", 332500, true],
        ["Набор пробных очковых линз \"ARLAN\" (РК МИ (МТ)-0№025192)", "surgical_kit", 585000, true],
        
        // Инструменты
        ["Ножницы глазные прямые Пакистан №011645", "instrument", 1700, false],
        ["НС 6.0 НЬЮ насадка моделировочная для ЭШЗ", "instrument", 6000, false],
        ["НС 7.0 НЬЮ насадка моделировочная для ЭШЗ", "instrument", 6000, false],
        
        // Импланты
        ["Орбитальный сферический имплант Oculfit (глазные протезы ОКУЛФИТ)", "implant", 71750.17, true],
        ["ОРБИТАЛЬНЫЙ СФЕРИЧЕСКИЙ ИМПЛАНТ OCULFIT 19ММ", "implant", 0, true],
        ["ОРБИТАЛЬНЫЙ СФЕРИЧЕСКИЙ ИМПЛАНТ OCULFIT 21ММ", "implant", 57866.27, true],
        ["ОРБИТАЛЬНЫЙ СФЕРИЧЕСКИЙ ИМПЛАНТ OCULFIT 23ММ", "implant", 57399.5, true],
        
        // Оборудование
        ["ОФТАЛЬМОЛОГИЧЕСКИЙ  АВТОМАТИЧЕСКИЙ КЕРАТОРЕФРАКТОМЕТР,модели: KR-800", "equipment", 3600000, true],
        
        // Расходники
        ["Париэтен КОМП 20/15СМ W THR/ррc2015", "consumable", 38507, false],
        ["Перчатки нитриловые Supermax №003152", "consumable", 15, false],
        
        // Офтальмологические растворы
        ["РИБОКРОСС ТЕ - ОФТАЛЬМОЛОГИЧЕСКИЙ РАСТВОР ДЛЯ КРОССЛИНКИНГА РОГОВИЦЫ", "ophthalmic_solution", 21785.56, false],
        ["РИБОФАСТ - ОФТАЛЬМОЛОГИЧЕСКИЙ РАСТВОР ДЛЯ КРОССЛИНКИНГА РОГОВИЦЫ", "ophthalmic_solution", 21344.88, false],
        
        // Роговичные кольца
        ["СЕГМЕНТ ИНТРАСТРОМАЛЬНЫЙ РОГОВИЧНЫЙ КОЛЬЦЕВОЙ FERRARA RING СТЕРИЛЬНЫЙ", "corneal_ring", 61904.9, true],
        
        // Инструменты
        ["СОНИС 3.023 Бюгель стальной, универсал.с винт.зажимом для 1 или 2 кювет БВУ (Не регистрируется) 12%", "instrument", 9800, false],
        
        // Силиконовое масло
        ["СТЕРИЛЬНОЕ СИЛИКОНОВОЕ МАСЛО SIOBAL S1000", "silicone_oil", 14402.74, false],
        ["СТЕРИЛЬНОЕ СИЛИКОНОВОЕ МАСЛО SIOBAL S5000", "silicone_oil", 16436.6, false],
        
        // Расходники
        ["Тест Ширмера (полоски) Tear Strips  №100", "consumable", 15790.75, false],
        
        // Инструменты
        ["ТЕХНИЧЕСКИЙ АНАЛОГ RP M.U", "instrument", 4800, false],
        
        // Оборудование
        ["Топограф корнеальный Easygraph с принадлежностями", "equipment", 4086698, true],
        ["Ультразвуковой очиститель для линз", "equipment", 18000, false],
        ["Универсальная пробная оправа для офтальмолога", "equipment", 27000, true],
        
        // Расходники
        ["Халат хирургический (НЕСТЕРИЛЬНО) (модель  2 , р.52-54 дл. 120 см., спанбонд,  голубой) №015833", "consumable", 600, false],
        
        // Оборудование
        ["ЦИФРОВОЙ ФОТОАППАРАТ DC ИЗ КОМПЛЕКТА ЩЕЛЕВАЯ ЛАМПА ОФТАЛЬМОЛОГИЧЕСКАЯ SL В ИСПОЛНЕНИИ 2G, 3G, D2, D4", "equipment", 2500000, true],
        
        // Расходники
        ["Шапочка \"Берет\" (53см, спанбонд пл.18г/м2, голубой) №015833 ", "consumable", 20, false],
        
        // Оборудование
        ["Щелевая лампа офтальмологическая SL в исполнении 2G с принадлежностями", "equipment", 2000000, true],
        ["ЩЕЛЕВАЯ ЛАМПА ОФТАЛЬМОЛОГИЧЕСКАЯ SL В ИСПОЛНЕНИИ D2 С ПРИНАДЛЕЖНОСТЯМИ", "equipment", 1950000, true],
    ];

    console.log(`Total products to seed: ${products.length}\n`);

    let created = 0;
    let skipped = 0;

    for (const [name, category, purchasePrice, trackSerials] of products) {
        // Check if product already exists
        const existing = await prisma.opticProduct.findFirst({
            where: { organizationId: orgId, name: name }
        });

        if (existing) {
            console.log(`SKIP (exists): ${name}`);
            skipped++;
            continue;
        }

        const slug = name
            .toLowerCase()
            .replace(/[^a-zа-яёА-ЯЁ0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 100);

        const type = 'product';

        await prisma.opticProduct.create({
            data: {
                organizationId: orgId,
                name: name,
                slug: slug + '-' + Date.now() + '-' + Math.random().toString(36).substring(7),
                category: category,
                type,
                purchasePrice: purchasePrice || 0,
                retailPrice: 0,
                minStock: 0,
                unit: 'шт',
                trackSerials: trackSerials,
                isPublic: false,
                isActive: true,
            }
        });
        created++;
        console.log(`CREATED: ${name} [${category}]`);
    }

    console.log(`\n=== DONE ===`);
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${products.length}`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
