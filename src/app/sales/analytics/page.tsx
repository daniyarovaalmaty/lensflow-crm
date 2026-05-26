'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
    BarChart3, 
    TrendingUp, 
    DollarSign, 
    Users, 
    Percent, 
    ArrowUpRight, 
    Megaphone, 
    Instagram, 
    Globe, 
    MessageSquare, 
    Loader2, 
    Sparkles, 
    Plus, 
    ArrowRight, 
    Target, 
    Activity, 
    HeartHandshake, 
    AlertCircle,
    PlayCircle,
    PauseCircle
} from 'lucide-react';
import Link from 'next/link';

interface KPI {
    totalLeads: number;
    totalConverted: number;
    conversionRate: string;
    totalBudgetSpent: number;
    cac: number;
    totalRevenue: number;
    roi: number;
    avgLeadCost: number;
}

interface FunnelItem {
    stage: string;
    label: string;
    value: number;
}

interface SourceItem {
    source: string;
    label: string;
    leads: number;
    converted: number;
    spend: number;
    revenue: number;
    cac: number;
    roi: number;
}

interface CampaignItem {
    id: string;
    campaignId: string;
    name: string;
    source: string;
    status: string;
    dailyBudget: number;
    totalSpend: number;
    leadsCount: number;
}

interface AnalyticsData {
    kpi: KPI;
    funnel: FunnelItem[];
    sources: SourceItem[];
    campaigns: CampaignItem[];
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function MarketingAnalyticsPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/crm/analytics');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            } else {
                setError('Не удалось загрузить данные аналитики');
            }
        } catch (err) {
            setError('Ошибка сети при загрузке аналитики');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    // Calculate funnel conversion drops
    const funnelWithPercentages = useMemo(() => {
        if (!data?.funnel || data.funnel.length === 0) return [];
        const maxVal = data.funnel[0].value || 1;
        return data.funnel.map((item, index) => {
            const pctOfTotal = maxVal > 0 ? Math.round((item.value / maxVal) * 100) : 0;
            let conversionFromPrevious = 100;
            if (index > 0 && data.funnel[index - 1].value > 0) {
                conversionFromPrevious = Math.round((item.value / data.funnel[index - 1].value) * 100);
            }
            return {
                ...item,
                pctOfTotal,
                conversionFromPrevious
            };
        });
    }, [data]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-500 font-medium animate-pulse">Вычисление сквозной аналитики...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                <div className="bg-red-50 border border-red-100 rounded-3xl p-8 max-w-md mx-auto shadow-sm">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Упс! Что-то пошло не так</h3>
                    <p className="text-sm text-gray-500 mb-6">{error || 'Нет данных для отображения'}</p>
                    <button onClick={fetchAnalytics} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all">
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    const { kpi, sources, campaigns } = data;

    return (
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-8 pb-20">
            {/* Header banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 border border-white/5">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-xs font-bold text-blue-300 mb-3 tracking-wide uppercase">
                            <Sparkles className="w-3.5 h-3.5" /> Сквозная Аналитика ROI
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Управление окупаемостью лидов</h1>
                        <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                            Автоматическое сопоставление рекламных бюджетов Meta / Google с реальными продажами ночных линз, стоимостью CAC и ROMI.
                        </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <Link href="/sales/pipeline" className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-950 rounded-2xl text-sm font-bold transition-all shadow-sm">
                            Воронка продаж <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {/* ROMI Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-100/50 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Окупаемость (ROMI)</span>
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className={`text-3xl font-black tracking-tight mb-2 ${kpi.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {kpi.roi > 0 ? '+' : ''}{kpi.roi}%
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                        Возврат инвестиций на рекламу
                    </p>
                </div>

                {/* CAC Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-100/50 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Стоимость привлечения (CAC)</span>
                        <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
                            <Target className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        {fmt(kpi.cac)} ₸
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                        Стоимость одного закрытого пациента
                    </p>
                </div>

                {/* Total Budget Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-100/50 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Общий расход</span>
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                        {fmt(kpi.totalBudgetSpent)} ₸
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                        Суммарный рекламный бюджет
                    </p>
                </div>

                {/* Total Revenue Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-blue-100/50 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Выручка от рекламы</span>
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                            <ArrowUpRight className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                        {fmt(kpi.totalRevenue)} ₸
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                        Выручка от закрытых лидов
                    </p>
                </div>
            </div>

            {/* Sub-KPI Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-100/50 border border-gray-200/40 rounded-3xl p-4 sm:p-5 mb-8 text-center sm:text-left">
                <div className="px-4 py-2 border-r border-gray-200/60 last:border-0 flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Всего лидов</span>
                    <span className="text-lg font-black text-gray-800">{kpi.totalLeads}</span>
                </div>
                <div className="px-4 py-2 border-r border-gray-200/60 last:border-0 flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Всего пациентов (Пациенты)</span>
                    <span className="text-lg font-black text-gray-800">{kpi.totalConverted}</span>
                </div>
                <div className="px-4 py-2 border-r border-gray-200/60 last:border-0 flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Конверсия воронки</span>
                    <span className="text-lg font-black text-blue-600">{kpi.conversionRate}%</span>
                </div>
                <div className="px-4 py-2 last:border-0 flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ср. цена лида (CPL)</span>
                    <span className="text-lg font-black text-gray-800">{fmt(kpi.avgLeadCost)} ₸</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* 1. Funnel visualization */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Конверсия Воронки Продаж</h2>
                                <p className="text-xs text-gray-400">Процент выживаемости лидов на каждом этапе</p>
                            </div>
                            <div className="p-2 bg-gray-50 border border-gray-100 rounded-xl">
                                <Activity className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>

                        {/* Interactive Funnel list */}
                        <div className="space-y-4">
                            {funnelWithPercentages.map((item, index) => (
                                <div key={item.stage} className="relative">
                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1 z-10 relative px-1">
                                        <span className="font-bold">{item.label}</span>
                                        <div className="flex gap-3">
                                            <span className="text-gray-400 font-medium">Кол-во: <strong className="text-gray-700">{item.value}</strong></span>
                                            <span className="text-blue-600 font-bold">{item.pctOfTotal}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-8 bg-gray-50 rounded-xl overflow-hidden border border-gray-100/50 relative">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500/80 to-indigo-500/85 rounded-r-lg transition-all duration-1000"
                                            style={{ width: `${item.pctOfTotal}%` }}
                                        />
                                        {index > 0 && item.value > 0 && (
                                            <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md h-fit my-auto">
                                                ↓ {item.conversionFromPrevious}% от пред.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Marketing channels */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Источники Привлечения</h2>
                                <p className="text-xs text-gray-400">Сравнение эффективности трафика</p>
                            </div>
                            <div className="p-2 bg-gray-50 border border-gray-100 rounded-xl">
                                <HeartHandshake className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>

                        {/* Channels list */}
                        <div className="space-y-3.5">
                            {sources.map(src => {
                                const sourceColors: Record<string, string> = {
                                    instagram: 'bg-pink-50 border-pink-100 text-pink-700',
                                    whatsapp: 'bg-emerald-50 border-emerald-100 text-emerald-700',
                                    website: 'bg-blue-50 border-blue-100 text-blue-700',
                                    manual: 'bg-slate-50 border-slate-100 text-slate-700',
                                    referral: 'bg-amber-50 border-amber-100 text-amber-700'
                                };
                                const sourceIcons: Record<string, any> = {
                                    instagram: Instagram,
                                    whatsapp: MessageSquare,
                                    website: Globe,
                                    manual: Users,
                                    referral: Percent
                                };
                                const IconComp = sourceIcons[src.source] || Megaphone;

                                return (
                                    <div key={src.source} className="border border-gray-100/80 rounded-2xl p-3 hover:border-blue-100 hover:bg-blue-50/5 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg border ${sourceColors[src.source] || 'bg-gray-50'}`}>
                                                    <IconComp className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-xs font-bold text-gray-800">{src.label}</span>
                                            </div>
                                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                {src.leads} лидов
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400 font-medium pt-1 border-t border-gray-50">
                                            <div>
                                                Расход: <span className="font-bold text-gray-700">{fmt(src.spend)} ₸</span>
                                            </div>
                                            <div>
                                                CAC: <span className="font-bold text-gray-700">{fmt(src.cac)} ₸</span>
                                            </div>
                                            <div>
                                                ROMI: <span className={`font-bold ${src.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{src.roi}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Ad Campaigns Table */}
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Рекламные Кампании (Meta & Google Ads)</h2>
                        <p className="text-xs text-gray-400">Прямой экспорт лидов по интеграции API spend webhooks</p>
                    </div>
                    <button className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-600 transition-colors">
                        <Plus className="w-4 h-4" /> Настроить интеграцию
                    </button>
                </div>
                {campaigns.length === 0 ? (
                    <div className="p-12 text-center">
                        <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-gray-800 mb-1">Нет подключенных кампаний</h4>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                            Настройте рекламную интеграцию Facebook Ads API или Google Ads API, чтобы автоматически импортировать кампании и расходы.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="py-4 px-6">Название кампании</th>
                                    <th className="py-4 px-6">Источник</th>
                                    <th className="py-4 px-6">Статус</th>
                                    <th className="py-4 px-6">Дневной бюджет</th>
                                    <th className="py-4 px-6">Всего потрачено</th>
                                    <th className="py-4 px-6">Получено лидов</th>
                                    <th className="py-4 px-6">Ср. цена лида (CPL)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map(camp => {
                                    const cpl = camp.leadsCount > 0 ? Math.round(camp.totalSpend / camp.leadsCount) : camp.totalSpend;
                                    return (
                                        <tr key={camp.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors text-xs font-medium text-gray-600">
                                            <td className="py-4 px-6 font-bold text-slate-800">{camp.name}</td>
                                            <td className="py-4 px-6">
                                                {camp.source === 'facebook' ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-bold">
                                                        Meta (Instagram/FB)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                                                        Google Ads
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                {camp.status === 'active' ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                                                        <PlayCircle className="w-3.5 h-3.5" /> Активна
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-bold">
                                                        <PauseCircle className="w-3.5 h-3.5" /> Приостановлена
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 font-semibold text-slate-900">{fmt(camp.dailyBudget)} ₸/день</td>
                                            <td className="py-4 px-6 font-bold text-slate-900">{fmt(camp.totalSpend)} ₸</td>
                                            <td className="py-4 px-6">
                                                <span className="font-bold text-blue-600 bg-blue-50/50 border border-blue-100 px-2 py-0.5 rounded-md">
                                                    {camp.leadsCount} лидов
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-900">{fmt(cpl)} ₸</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
