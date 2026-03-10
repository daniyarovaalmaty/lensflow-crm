'use client';

import { useMemo } from 'react';
import {
    TrendingUp, Package, DollarSign, BarChart3, PieChart, Activity,
    AlertTriangle, Zap, Building2, MapPin
} from 'lucide-react';
import { getAnalyticsSummary } from '@/lib/historicalAnalytics';

const PRICE_PER_LENS = 17_500;

export default function AnalyticsPage() {
    const analytics = useMemo(() => getAnalyticsSummary(), []);



    const fmt = (n: number) => n.toLocaleString('ru-RU');
    const fmtMoney = (n: number) => `${fmt(n)} ₸`;

    // Find max values for bar chart scaling
    const maxOrders = Math.max(...analytics.monthlyData.map(m => m.totalOrders));
    const maxLenses = Math.max(...analytics.monthlyData.map(m => m.totalLenses));

    // Growth calculation
    const lastMonth = analytics.monthlyData[analytics.monthlyData.length - 2];
    const prevMonth = analytics.monthlyData[analytics.monthlyData.length - 3];
    const growth = lastMonth && prevMonth
        ? ((lastMonth.totalOrders - prevMonth.totalOrders) / prevMonth.totalOrders * 100).toFixed(1)
        : '0';

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">📊 Аналитика старых заказов</h1>
                <p className="text-sm text-gray-500 mt-1">Данные из Google Sheets · Июль 2025 — Март 2026 · {fmt(analytics.totalOrders)} заказов</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {[
                    { label: 'Всего заказов', value: fmt(analytics.totalOrders), icon: Package, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
                    { label: 'Всего линз', value: fmt(analytics.totalLenses), icon: Activity, color: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-700' },
                    { label: 'Выручка', value: fmtMoney(analytics.totalRevenue), icon: DollarSign, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
                    { label: 'Сред. в месяц', value: fmt(analytics.avgOrdersPerMonth), icon: TrendingUp, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
                    { label: 'Доработки', value: `${analytics.remakeRate}%`, icon: AlertTriangle, color: 'bg-orange-500', light: 'bg-orange-50 text-orange-700' },
                    { label: 'Срочные', value: `${analytics.urgentRate}%`, icon: Zap, color: 'bg-red-500', light: 'bg-red-50 text-red-700' },
                ].map(kpi => (
                    <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-lg ${kpi.light} flex items-center justify-center`}>
                                <kpi.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                        <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Monthly Orders Bar Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-500" />
                        Заказы по месяцам
                    </h3>
                    <div className="space-y-3">
                        {analytics.monthlyData.map(m => (
                            <div key={m.month} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-16 shrink-0 text-right">{m.label.split(' ')[0].slice(0, 3)}</span>
                                <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg transition-all duration-500"
                                        style={{ width: `${(m.totalOrders / maxOrders) * 100}%` }}
                                    />
                                    <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-gray-700">
                                        {m.totalOrders} заказов · {fmt(m.totalLenses)} линз
                                    </span>
                                </div>
                                <span className="text-xs font-semibold text-gray-900 w-20 text-right">{fmtMoney(m.revenue)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lens Type Distribution */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-indigo-500" />
                        Распределение по типам линз
                    </h3>

                    {/* Donut-like visualization */}
                    <div className="flex items-center gap-8 mb-6">
                        <div className="relative w-40 h-40">
                            <svg viewBox="0 0 36 36" className="w-full h-full">
                                {/* Toric */}
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#818cf8" strokeWidth="3.5"
                                    strokeDasharray={`${analytics.toricPct} ${100 - analytics.toricPct}`}
                                    strokeDashoffset="25" />
                                {/* Sphere */}
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#34d399" strokeWidth="3.5"
                                    strokeDasharray={`${analytics.spherePct} ${100 - analytics.spherePct}`}
                                    strokeDashoffset={`${25 - analytics.toricPct}`} />
                                {/* Trial */}
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#fbbf24" strokeWidth="3.5"
                                    strokeDasharray={`${analytics.trialPct} ${100 - analytics.trialPct}`}
                                    strokeDashoffset={`${25 - analytics.toricPct - analytics.spherePct}`} />
                                {/* RGP */}
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f87171" strokeWidth="3.5"
                                    strokeDasharray={`${analytics.rgpPct} ${100 - analytics.rgpPct}`}
                                    strokeDashoffset={`${25 - analytics.toricPct - analytics.spherePct - analytics.trialPct}`} />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-gray-900">{fmt(analytics.totalOrders)}</span>
                                <span className="text-xs text-gray-400">заказов</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: 'Торические', pct: analytics.toricPct, color: 'bg-indigo-400' },
                                { label: 'Сферические', pct: analytics.spherePct, color: 'bg-emerald-400' },
                                { label: 'Пробные (DK50)', pct: analytics.trialPct, color: 'bg-amber-400' },
                                { label: 'RGP', pct: analytics.rgpPct, color: 'bg-red-400' },
                            ].map(t => (
                                <div key={t.label} className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${t.color}`} />
                                    <span className="text-sm text-gray-600">{t.label}</span>
                                    <span className="text-sm font-semibold text-gray-900 ml-auto">{t.pct}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Monthly type breakdown */}
                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-xs font-medium text-gray-400 mb-3">ПО МЕСЯЦАМ</h4>
                        <div className="space-y-2">
                            {analytics.monthlyData.map(m => {
                                const total = m.toricCount + m.sphereCount + m.trialCount + m.rgpCount;
                                return (
                                    <div key={m.month} className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 w-12">{m.label.split(' ')[0].slice(0, 3)}</span>
                                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-indigo-400" style={{ width: `${(m.toricCount / total) * 100}%` }} />
                                            <div className="h-full bg-emerald-400" style={{ width: `${(m.sphereCount / total) * 100}%` }} />
                                            <div className="h-full bg-amber-400" style={{ width: `${(m.trialCount / total) * 100}%` }} />
                                            <div className="h-full bg-red-400" style={{ width: `${(m.rgpCount / total) * 100}%` }} />
                                        </div>
                                        <span className="text-xs text-gray-500 w-8 text-right">{total}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Выручка по месяцам (17 500 ₸ за линзу)
                </h3>
                <div className="flex items-end gap-3 h-48">
                    {analytics.monthlyData.map(m => {
                        const maxRevenue = Math.max(...analytics.monthlyData.map(mm => mm.revenue));
                        const heightPct = (m.revenue / maxRevenue) * 100;
                        return (
                            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-gray-700">{(m.revenue / 1_000_000).toFixed(1)}M</span>
                                <div className="w-full relative flex-1 flex items-end">
                                    <div
                                        className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t-lg transition-all duration-500"
                                        style={{ height: `${heightPct}%`, minHeight: '8px' }}
                                    />
                                </div>
                                <span className="text-xs text-gray-400">{m.label.split(' ')[0].slice(0, 3)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Row: Top Clinics + City Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Clinics */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-violet-500" />
                        Топ-20 клиник по заказам
                    </h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {analytics.topClinics.map((clinic, idx) => (
                            <div key={clinic.name} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {idx + 1}
                                </span>
                                <span className="text-sm text-gray-800 flex-1 truncate">{clinic.name}</span>
                                <span className="text-xs text-gray-400">{clinic.totalOrders} заказов</span>
                                <span className="text-xs font-semibold text-gray-700 w-24 text-right">{fmtMoney(clinic.revenue)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* City Distribution */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        География заказов
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(analytics.cityDistribution)
                            .sort(([, a], [, b]) => b - a)
                            .map(([city, count]) => {
                                const maxCityCount = Math.max(...Object.values(analytics.cityDistribution));
                                return (
                                    <div key={city} className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600 w-20 shrink-0">{city}</span>
                                        <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                                            <div
                                                className="h-full bg-gradient-to-r from-rose-400 to-rose-300 rounded-lg"
                                                style={{ width: `${(count / maxCityCount) * 100}%` }}
                                            />
                                            <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-gray-700">
                                                {count} заказов
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400 w-14 text-right">
                                            {((count / analytics.totalOrders) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>

            {/* Summary stats at the bottom */}
            <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                <h3 className="text-lg font-bold mb-4">📈 Итого за период Июль 2025 — Март 2026</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-blue-200 text-xs">Общая выручка</p>
                        <p className="text-2xl font-bold">{(analytics.totalRevenue / 1_000_000).toFixed(1)} млн ₸</p>
                    </div>
                    <div>
                        <p className="text-blue-200 text-xs">Среднее линз на заказ</p>
                        <p className="text-2xl font-bold">{analytics.avgLensesPerOrder}</p>
                    </div>
                    <div>
                        <p className="text-blue-200 text-xs">Торические / Сферические</p>
                        <p className="text-2xl font-bold">{analytics.toricPct}% / {analytics.spherePct}%</p>
                    </div>
                    <div>
                        <p className="text-blue-200 text-xs">Количество клиник</p>
                        <p className="text-2xl font-bold">{analytics.topClinics.length}+</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
