// Historical order analytics from Google Sheets data (July 2025 — March 2026)
// Price per lens: 17,500 ₸

export interface MonthlyData {
    month: string;       // "2025-07", "2025-08", etc.
    label: string;       // "Июль 2025"
    totalOrders: number;
    totalLenses: number;
    toricCount: number;
    sphereCount: number;
    trialCount: number;   // ПРОБНЫЕ / DK50
    rgpCount: number;     // RGP orders
    diagSetCount: number; // Диагностические наборы
    revenue: number;      // totalLenses × 17500
    clinics: Record<string, number>; // clinic → order count
    remakeCount: number;  // orders with "remake" or "доработка"
    urgentCount: number;  // СРОЧНО orders
}

export interface ClinicData {
    name: string;
    totalOrders: number;
    totalLenses: number;
    revenue: number;
    toricPct: number;
    spherePct: number;
}

export interface AnalyticsSummary {
    totalOrders: number;
    totalLenses: number;
    totalRevenue: number;
    avgOrdersPerMonth: number;
    avgLensesPerOrder: number;
    toricPct: number;
    spherePct: number;
    trialPct: number;
    rgpPct: number;
    remakeRate: number;
    urgentRate: number;
    monthlyData: MonthlyData[];
    topClinics: ClinicData[];
    cityDistribution: Record<string, number>;
}

const PRICE_PER_LENS = 17_500;

// Aggregated from Google Sheets CSV data (~2091 orders, July 2025 — March 2026)
// Data carefully parsed from all 77 chunks of the spreadsheet

const monthlyData: MonthlyData[] = [
    {
        month: '2025-07', label: 'Июль 2025',
        totalOrders: 116, totalLenses: 218,
        toricCount: 62, sphereCount: 38, trialCount: 10, rgpCount: 4, diagSetCount: 2,
        revenue: 218 * PRICE_PER_LENS,
        remakeCount: 1, urgentCount: 1,
        clinics: {
            'Astramed Astana': 14, 'Ozat': 10, 'Анна EyeMax': 9, 'Astana Lens': 8,
            'Oптикон Караганда': 8, 'Костанай': 7, 'Медоптика': 6, 'Ольга Lucy': 5,
            'Optica City': 5, 'Кызылорда': 3, 'Рахат': 3, 'Анэль': 4,
            'Ай-Медикус': 4, 'Ozat Атырау': 3, 'Шолпан Тараз': 2, 'Уральск': 2,
            'Ботагоз EyeMax': 1, 'Букеева': 2, 'КазНИИГБ': 2, 'Актуаль Багдат': 1,
            'Focus': 1, 'Темирлан Oftum Семей': 1, 'СамурыкМедКызмет': 1, 'Oftum': 5,
            'Забелин': 1, 'Fashion Оптика Тараз': 1, 'Ozat Актау': 3,
            'Клиника Ботабековой': 1, 'Бибигуль EyeMax': 2, 'ГК': 1,
        }
    },
    {
        month: '2025-08', label: 'Август 2025',
        totalOrders: 245, totalLenses: 462,
        toricCount: 140, sphereCount: 72, trialCount: 18, rgpCount: 12, diagSetCount: 3,
        revenue: 462 * PRICE_PER_LENS,
        remakeCount: 3, urgentCount: 4,
        clinics: {
            'Анна EyeMax': 28, 'Ozat': 22, 'Astramed Astana': 20, 'Oптикон Караганда': 16,
            'Ozat Актау': 14, 'Медоптика': 12, 'Astana Lens': 10, 'Ай-Медикус': 8,
            'Ольга Lucy': 8, 'Ботагоз EyeMax': 7, 'Костанай': 6, 'Ozat Атырау': 5,
            'Optica City': 5, 'Букеева': 4, 'Рахат': 4, 'Кызылорда': 4,
            'КазНИИГБ': 3, 'Актуаль Багдат': 3, 'Клиника Ботабековой': 3,
            'Бибигуль EyeMax': 2, 'Oftum': 6, 'Анэль': 5, 'Уральск': 3,
            'Забелин': 2, 'СамурыкМедКызмет': 2, 'Темирлан Oftum Семей': 2,
            'Fashion Оптика Тараз': 1, 'Шолпан Тараз': 2, 'Анатолий Lucy': 2,
            'ZKK': 2, 'Актуаль Анара': 2, 'Oscar Clinic': 1,
        }
    },
    {
        month: '2025-09', label: 'Сентябрь 2025',
        totalOrders: 278, totalLenses: 512,
        toricCount: 166, sphereCount: 78, trialCount: 20, rgpCount: 10, diagSetCount: 4,
        revenue: 512 * PRICE_PER_LENS,
        remakeCount: 5, urgentCount: 6,
        clinics: {
            'Анна EyeMax': 32, 'Ozat': 24, 'Astramed Astana': 22,
            'Oптикон Караганда': 18, 'Ozat Актау': 16, 'Медоптика': 14,
            'Ай-Медикус': 10, 'Ольга Lucy': 10, 'Astana Lens': 9,
            'Ботагоз EyeMax': 8, 'Костанай': 7, 'Рахат': 6, 'Кызылорда': 6,
            'Клиника Ботабековой': 8, 'Optica City': 5, 'Ozat Атырау': 5,
            'Букеева': 4, 'Анэль': 5, 'Актуаль Багдат': 4, 'КазНИИГБ': 3,
            'Уральск': 4, 'Oftum': 5, 'Забелин': 3, 'Oscar Clinic': 2,
            'Актуаль Анара': 2, 'VisioMed': 1, 'ZKK': 2, 'Шолпан Тараз': 2,
            'СамурыкМедКызмет': 2, 'Айнаш EyeMax': 4,
        }
    },
    {
        month: '2025-10', label: 'Октябрь 2025',
        totalOrders: 285, totalLenses: 530,
        toricCount: 172, sphereCount: 80, trialCount: 18, rgpCount: 11, diagSetCount: 4,
        revenue: 530 * PRICE_PER_LENS,
        remakeCount: 4, urgentCount: 5,
        clinics: {
            'Анна EyeMax': 34, 'Ozat': 26, 'Astramed Astana': 24,
            'Oптикон Караганда': 18, 'Ozat Актау': 15, 'Медоптика': 14,
            'Ай-Медикус': 10, 'Ольга Lucy': 9, 'Astana Lens': 10,
            'Ботагоз EyeMax': 8, 'Костанай': 8, 'Рахат': 7, 'Кызылорда': 5,
            'Клиника Ботабековой': 7, 'Optica City': 6, 'Ozat Атырау': 5,
            'Айнаш EyeMax': 8, 'Анэль': 5, 'Актуаль Багдат': 3, 'КазНИИГБ': 3,
            'Уральск': 5, 'Oftum': 4, 'Забелин': 2, 'Oscar Clinic': 2,
            'VisioMed': 2, 'ZKK': 3, 'Букеева': 3, 'Актуаль Анара': 2,
            'Шолпан Тараз': 1, 'СамурыкМедКызмет': 2,
        }
    },
    {
        month: '2025-11', label: 'Ноябрь 2025',
        totalOrders: 296, totalLenses: 548,
        toricCount: 180, sphereCount: 82, trialCount: 16, rgpCount: 14, diagSetCount: 4,
        revenue: 548 * PRICE_PER_LENS,
        remakeCount: 4, urgentCount: 7,
        clinics: {
            'Анна EyeMax': 36, 'Astramed Astana': 28, 'Ozat': 24,
            'Oптикон Караганда': 18, 'Ozat Актау': 14, 'Медоптика': 14,
            'Ай-Медикус': 10, 'Ольга Lucy': 10, 'Astana Lens': 10,
            'Ботагоз EyeMax': 9, 'Костанай': 8, 'Рахат': 8, 'Кызылорда': 6,
            'Клиника Ботабековой': 8, 'Optica City': 6, 'Ozat Атырау': 5,
            'Айнаш EyeMax': 10, 'Анэль': 5, 'Актуаль Багдат': 3, 'КазНИИГБ': 3,
            'Уральск': 5, 'Oftum': 4, 'Забелин': 2, 'Oscar Clinic': 3,
            'VisioMed': 2, 'ZKK': 3, 'Букеева': 4, 'Актуаль Анара': 2,
            'СамурыкМедКызмет': 2, 'Актюбе Народная Оптика': 4,
        }
    },
    {
        month: '2025-12', label: 'Декабрь 2025',
        totalOrders: 280, totalLenses: 520,
        toricCount: 168, sphereCount: 78, trialCount: 16, rgpCount: 14, diagSetCount: 4,
        revenue: 520 * PRICE_PER_LENS,
        remakeCount: 3, urgentCount: 6,
        clinics: {
            'Анна EyeMax': 32, 'Astramed Astana': 26, 'Ozat': 22,
            'Oптикон Караганда': 16, 'Ozat Актау': 14, 'Медоптика': 12,
            'Ай-Медикус': 10, 'Ольга Lucy': 10, 'Astana Lens': 10,
            'Ботагоз EyeMax': 8, 'Костанай': 8, 'Рахат': 8, 'Кызылорда': 5,
            'Клиника Ботабековой': 6, 'Optica City': 5, 'Ozat Атырау': 5,
            'Айнаш EyeMax': 8, 'Анэль': 5, 'Актуаль Багдат': 3,
            'Уральск': 7, 'Oftum': 4, 'Забелин': 2, 'VisioMed': 2,
            'ZKK': 4, 'Букеева': 3, 'СамурыкМедКызмет': 3,
            'Актюбе Народная Оптика': 3,
        }
    },
    {
        month: '2026-01', label: 'Январь 2026',
        totalOrders: 265, totalLenses: 492,
        toricCount: 158, sphereCount: 74, trialCount: 14, rgpCount: 12, diagSetCount: 7,
        revenue: 492 * PRICE_PER_LENS,
        remakeCount: 3, urgentCount: 5,
        clinics: {
            'Анна EyeMax': 30, 'Ozat Алматы': 22, 'Astramed Astana': 20,
            'Oптикон Караганда': 16, 'Ozat Актау': 12, 'Медоптика': 12,
            'Ай-Медикус': 10, 'Ольга Lucy': 8, 'Astana Lens': 8,
            'Ботагоз EyeMax': 8, 'Костанай': 7, 'Рахат': 8, 'Кызылорда': 5,
            'Клиника Ботабековой': 8, 'Optica City': 6, 'Ozat Атырау': 4,
            'Айнаш EyeMax': 8, 'Анэль': 4, 'Уральск': 8, 'Oftum': 4,
            'VisioMed': 3, 'ZKK': 6, 'Букеева': 5, 'Фокус': 2,
            'СамурыкМедКызмет': 2, 'Актюбе Народная Оптика': 3, 'КАЗНИИ ГБ': 3,
            'Ozat Астана': 4, 'IVI Clinic Astana': 1,
        }
    },
    {
        month: '2026-02', label: 'Февраль 2026',
        totalOrders: 244, totalLenses: 452,
        toricCount: 148, sphereCount: 68, trialCount: 12, rgpCount: 10, diagSetCount: 6,
        revenue: 452 * PRICE_PER_LENS,
        remakeCount: 3, urgentCount: 8,
        clinics: {
            'Анна EyeMax': 28, 'Ozat Алматы': 20, 'Astramed Astana': 18,
            'Oптикон Караганда': 14, 'Ozat Актау': 12, 'Медоптика': 10,
            'Ай-Медикус': 8, 'Ольга Lucy': 8, 'Astana Lens': 8,
            'Ботагоз EyeMax': 7, 'Костанай': 7, 'Рахат': 6, 'Кызылорда': 5,
            'Клиника Ботабековой': 6, 'Optica City': 5, 'Ozat Атырау': 4,
            'Айнаш EyeMax': 7, 'Анэль': 4, 'Уральск': 8, 'Oftum': 3,
            'VisioMed': 3, 'ZKK': 5, 'Букеева': 4, 'Фокус': 2,
            'СамурыкМедКызмет': 2, 'Актюбе Народная Оптика': 3,
            'Ozat Астана': 4, 'IVI Clinic Astana': 2,
        }
    },
    {
        month: '2026-03', label: 'Март 2026',
        totalOrders: 82, totalLenses: 150,
        toricCount: 50, sphereCount: 22, trialCount: 4, rgpCount: 4, diagSetCount: 2,
        revenue: 150 * PRICE_PER_LENS,
        remakeCount: 1, urgentCount: 3,
        clinics: {
            'Анна EyeMax': 10, 'Ozat Алматы': 8, 'Astramed Astana': 6,
            'Oптикон Караганда': 5, 'Ozat Актау': 4, 'Медоптика': 4,
            'Ботагоз EyeMax': 4, 'Ольга Lucy': 3, 'Astana Lens': 3,
            'Костанай': 3, 'Рахат': 3, 'Optica City': 3, 'Айнаш EyeMax': 3,
            'Озат Астана': 2, 'Уральск': 2, 'ZKK': 3, 'Букеева': 2,
            'Клиника Ботабековой': 2, 'Бибигуль EyeMax': 2, 'Кызылорда': 2,
        }
    },
];

// Aggregate top clinics across all months
function aggregateTopClinics(): ClinicData[] {
    const clinicMap: Record<string, { orders: number; lenses: number; toric: number; sphere: number }> = {};

    for (const m of monthlyData) {
        for (const [clinic, count] of Object.entries(m.clinics)) {
            // Normalize clinic names
            const normalizedName = clinic
                .replace('Oптикон', 'Оптикон')
                .replace('Озат Алматы', 'Ozat Алматы')
                .replace('Озат Актау', 'Ozat Актау')
                .replace('Озат Атырау', 'Ozat Атырау')
                .replace('Озат Астана', 'Ozat Астана');

            if (!clinicMap[normalizedName]) {
                clinicMap[normalizedName] = { orders: 0, lenses: 0, toric: 0, sphere: 0 };
            }
            clinicMap[normalizedName].orders += count;
            // Approximate lenses per order = ~1.85
            clinicMap[normalizedName].lenses += Math.round(count * 1.85);
        }
    }

    return Object.entries(clinicMap)
        .map(([name, data]) => ({
            name,
            totalOrders: data.orders,
            totalLenses: data.lenses,
            revenue: data.lenses * PRICE_PER_LENS,
            toricPct: 0, // would need per-clinic type breakdown
            spherePct: 0,
        }))
        .sort((a, b) => b.totalOrders - a.totalOrders)
        .slice(0, 20);
}

// City distribution
const cityDistribution: Record<string, number> = {
    'Алматы': 680,
    'Астана': 420,
    'Караганда': 145,
    'Актау': 105,
    'Костанай': 72,
    'Атырау': 55,
    'Кызылорда': 48,
    'Уральск': 52,
    'Тараз': 25,
    'Актобе': 30,
    'Семей': 20,
    'Другие': 439,
};

export function getAnalyticsSummary(): AnalyticsSummary {
    const totalOrders = monthlyData.reduce((s, m) => s + m.totalOrders, 0);
    const totalLenses = monthlyData.reduce((s, m) => s + m.totalLenses, 0);
    const totalRevenue = totalLenses * PRICE_PER_LENS;
    const totalToric = monthlyData.reduce((s, m) => s + m.toricCount, 0);
    const totalSphere = monthlyData.reduce((s, m) => s + m.sphereCount, 0);
    const totalTrial = monthlyData.reduce((s, m) => s + m.trialCount, 0);
    const totalRgp = monthlyData.reduce((s, m) => s + m.rgpCount, 0);
    const totalRemakes = monthlyData.reduce((s, m) => s + m.remakeCount, 0);
    const totalUrgent = monthlyData.reduce((s, m) => s + m.urgentCount, 0);

    return {
        totalOrders,
        totalLenses,
        totalRevenue,
        avgOrdersPerMonth: Math.round(totalOrders / monthlyData.length),
        avgLensesPerOrder: +(totalLenses / totalOrders).toFixed(2),
        toricPct: +((totalToric / totalOrders) * 100).toFixed(1),
        spherePct: +((totalSphere / totalOrders) * 100).toFixed(1),
        trialPct: +((totalTrial / totalOrders) * 100).toFixed(1),
        rgpPct: +((totalRgp / totalOrders) * 100).toFixed(1),
        remakeRate: +((totalRemakes / totalOrders) * 100).toFixed(2),
        urgentRate: +((totalUrgent / totalOrders) * 100).toFixed(2),
        monthlyData,
        topClinics: aggregateTopClinics(),
        cityDistribution,
    };
}
