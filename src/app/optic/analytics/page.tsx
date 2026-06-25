'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    BarChart3, TrendingUp, DollarSign, Users, Award, 
    ArrowRight, ShoppingBag, ArrowLeft, Calendar, 
    Percent, HelpCircle, Activity, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import QuickNav from '@/components/ui/QuickNav';

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function OpticAnalyticsPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [period, setPeriod] = useState('30days');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/optic/analytics?period=${period}`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch (e) {
            console.error('Failed to load analytics:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [period]);

    if (loading && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-500">Загрузка сквозной аналитики...</p>
                </div>
            </div>
        );
    }

    const kpi = data?.kpi || {
        totalRevenue: 0,
        totalSales: 0,
        avgCheck: 0,
        ltv: 0,
        newPatientsCount: 0,
        leadConversionRate: 0,
        romi: 0,
        totalMarketingSpend: 0,
        attributedLeadRevenue: 0,
    };

    const funnel = data?.crmFunnel || {};
    const categories = data?.categoriesBreakdown || [];
    const topPatients = data?.top10Patients || [];
    const topItems = data?.topSellingItems || [];
    const dynamics = data?.dynamics || [];

    // Calculate funnel progression levels for visualization
    const totalLeads = (funnel.new_lead || 0) + (funnel.contacted || 0) + (funnel.qualified || 0) + (funnel.appointment || 0) + (funnel.visited || 0) + (funnel.converted || 0);
    
    const funnelSteps = [
        { label: 'Маркетинг Бюджет', val: `${fmt(kpi.totalMarketingSpend)} ₸`, desc: 'Расходы на рекламу', color: 'from-blue-500 to-indigo-500' },
        { label: 'Всего Лидов', val: `${totalLeads} лид.`, desc: 'Заявки в CRM', color: 'from-indigo-500 to-violet-500' },
        { label: 'Записано (Визит)', val: `${(funnel.appointment || 0) + (funnel.visited || 0)} чел.`, desc: 'Запись на прием', color: 'from-violet-500 to-fuchsia-500' },
        { label: 'Конвертировано', val: `${funnel.converted || 0} пац.`, desc: 'Создано пациентов', color: 'from-fuchsia-500 to-emerald-500' },
        { label: 'Получено оплат', val: `${kpi.totalSales} транз.`, desc: 'Продажи через POS', color: 'from-emerald-500 to-teal-500' },
        { label: 'Общая Выручка', val: `${fmt(kpi.totalRevenue)} ₸`, desc: 'Суммарный доход', color: 'from-teal-500 to-green-500' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-12 animate-fade-in">
            {/* Top Navigation Row */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm px-4 sm:px-6 py-4">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link href="/optic/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <h1 className="text-xl sm:text-3xl font-black text-gray-900 flex items-center gap-2.5 tracking-tight">
                                <BarChart3 className="w-6 h-6 text-violet-600" /> Сквозная аналитика
                            </h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            Комплексные метрики: Маркетинг → Лиды → Прием денег → Окупаемость (ROMI)
                        </p>
                    </div>

                    {/* Period filters & Quick navigation */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1.5 shadow-inner">
                            {[
                                { key: 'today', label: 'Сегодня' },
                                { key: '7days', label: '7 дней' },
                                { key: '30days', label: '30 дней' },
                                { key: 'all', label: 'Все время' },
                            ].map(btn => (
                                <button
                                    key={btn.key}
                                    onClick={() => setPeriod(btn.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        period === btn.key 
                                            ? 'bg-white text-violet-700 shadow-sm font-extrabold scale-105' 
                                            : 'text-gray-500 hover:bg-white/50'
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Embedded Quick Navigation */}
                <div className="max-w-[1600px] mx-auto mt-4 border-t border-gray-100 pt-3">
                    <QuickNav />
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 mt-6 space-y-6">

                {/* KPI Metrics Dashboard Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* KPI 1 */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Общая Выручка</span>
                            <div className="w-7 h-7 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xl sm:text-2xl font-black text-gray-900">{fmt(kpi.totalRevenue)} ₸</div>
                            <span className="text-[10px] text-gray-400 mt-2 block font-medium">Всего POS оплат</span>
                        </div>
                    </div>

                    {/* KPI 2 */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Средний чек</span>
                            <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xl sm:text-2xl font-black text-gray-900">{fmt(kpi.avgCheck)} ₸</div>
                            <span className="text-[10px] text-gray-400 mt-2 block font-medium">Выручка / продажи</span>
                        </div>
                    </div>

                    {/* KPI 3 */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">LTV Пациента</span>
                            <div className="w-7 h-7 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <Award className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xl sm:text-2xl font-black text-gray-900">{fmt(kpi.ltv)} ₸</div>
                            <span className="text-[10px] text-emerald-600 font-semibold mt-2 block">Пожизненный доход</span>
                        </div>
                    </div>

                    {/* KPI 4 */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Новые Пациенты</span>
                            <div className="w-7 h-7 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xl sm:text-2xl font-black text-gray-900">+{kpi.newPatientsCount}</div>
                            <span className="text-[10px] text-gray-400 mt-2 block font-medium">Регистраций за период</span>
                        </div>
                    </div>

                    {/* KPI 5 */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Конверсия CRM</span>
                            <div className="w-7 h-7 rounded-xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600 group-hover:scale-110 transition-transform">
                                <Percent className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xl sm:text-2xl font-black text-gray-900">{kpi.leadConversionRate}%</div>
                            <span className="text-[10px] text-fuchsia-600 font-semibold mt-2 block">Лид → Пациент</span>
                        </div>
                    </div>

                    {/* KPI 6 */}
                    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Окупаемость ROMI</span>
                            <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xl sm:text-2xl font-black text-gray-900">{kpi.romi}%</div>
                            <span className={`text-[10px] font-bold mt-2 block ${kpi.romi > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {kpi.romi > 0 ? 'Прибыльный трафик' : 'Убыточный трафик'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* VISUAL END-TO-END FUNNEL: Lead to Revenue */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-5 h-5 text-amber-500 animate-spin-slow" />
                        <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">Сквозная воронка от клика до кассы</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {funnelSteps.map((step, idx) => (
                            <div key={idx} className="relative flex flex-col justify-between bg-gray-50/70 hover:bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-violet-100 transition-all duration-300 group">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 block mb-1">Шаг {idx + 1}</span>
                                    <h4 className="text-xs sm:text-sm font-extrabold text-gray-700 group-hover:text-violet-700 transition-colors">{step.label}</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{step.desc}</p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-end justify-between">
                                    <span className="text-base sm:text-lg font-black text-gray-900">{step.val}</span>
                                    <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${step.color} shadow-sm animate-pulse`} />
                                </div>

                                {idx < 5 && (
                                    <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-150 text-gray-300 w-7 h-7 rounded-full items-center justify-center shadow-sm">
                                        <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Categories breakdown block */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <ShoppingBag className="w-5 h-5 text-indigo-500" />
                                <h2 className="text-sm sm:text-base font-extrabold text-gray-800 uppercase tracking-tight">Категории выручки</h2>
                            </div>

                            {categories.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 text-sm font-medium">Нет продаж за указанный период</div>
                            ) : (
                                <div className="space-y-4">
                                    {categories.map((cat: any, i: number) => {
                                        const percentage = kpi.totalRevenue > 0 ? Math.round((cat.value / kpi.totalRevenue) * 100) : 0;
                                        return (
                                            <div key={i} className="space-y-1.5 text-gray-700">
                                                <div className="flex justify-between text-xs sm:text-sm font-bold">
                                                    <span>{cat.name} <span className="text-gray-400 font-medium text-xs ml-1">({cat.quantity || 0} шт.)</span></span>
                                                    <span>{fmt(cat.value)} ₸ ({percentage}%)</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2.5 shadow-inner">
                                                    <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-bold">
                            <span>Категория линз, оправ и услуг</span>
                            <span>Обновлено только что</span>
                        </div>
                    </div>

                    {/* Top patients block */}
                    <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <Award className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-sm sm:text-base font-extrabold text-gray-800 uppercase tracking-tight">Топ-10 пациентов по выручке (LTV)</h2>
                            </div>

                            {topPatients.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 text-sm font-medium">Нет зарегистрированных покупок пациентов</div>
                            ) : (
                                <div className="overflow-x-auto -mx-6 sm:mx-0">
                                    <table className="w-full text-left text-xs sm:text-sm">
                                        <thead className="bg-gray-50/80 text-gray-400 font-extrabold text-[10px] uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Пациент</th>
                                                <th className="px-4 py-3 text-center">Продаж</th>
                                                <th className="px-6 py-3 text-right">Всего оплат</th>
                                                <th className="px-6 py-3 text-right">В базе с</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {topPatients.map((p: any, i: number) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-3.5">
                                                        <div className="font-extrabold text-gray-800 flex items-center gap-1.5">
                                                            {i === 0 && '🥇'}
                                                            {i === 1 && '🥈'}
                                                            {i === 2 && '🥉'}
                                                            {p.name}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 font-bold mt-0.5">{p.phone}</div>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-center font-bold text-gray-600">{p.ordersCount} шт.</td>
                                                    <td className="px-6 py-3.5 text-right font-black text-violet-700 text-sm sm:text-base">{fmt(p.totalSpent)} ₸</td>
                                                    <td className="px-6 py-3.5 text-right text-xs text-gray-400 font-bold">
                                                        {p.joinedDate ? new Date(p.joinedDate).toLocaleDateString('ru-RU') : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 text-right">
                            <Link href="/optic/patients" className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">
                                К базе пациентов <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Products Summary block */}
                {data?.productsSummary && (
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-indigo-500" />
                            <h2 className="text-sm sm:text-base font-extrabold text-gray-800 uppercase tracking-tight">Сводка по проданным товарам</h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            <div className="bg-blue-50/50 rounded-2xl p-4">
                                <div className="text-xs font-bold text-gray-500 mb-1">ОК-линзы (жесткие)</div>
                                <div className="text-xl font-black text-blue-700">{data.productsSummary.hardLenses} шт.</div>
                            </div>
                            <div className="bg-green-50/50 rounded-2xl p-4">
                                <div className="text-xs font-bold text-gray-500 mb-1">МКЛ (мягкие линзы)</div>
                                <div className="text-xl font-black text-green-700">{data.productsSummary.softLenses} шт.</div>
                            </div>
                            <div className="bg-orange-50/50 rounded-2xl p-4">
                                <div className="text-xs font-bold text-gray-500 mb-1">Оправы (С/З и обычные)</div>
                                <div className="text-xl font-black text-orange-700">
                                    {data.productsSummary.frames + data.productsSummary.sunGlasses} шт.
                                    <span className="block text-[10px] text-gray-400 font-medium mt-1">Солнце: {data.productsSummary.sunGlasses} | Обычные: {data.productsSummary.frames}</span>
                                </div>
                            </div>
                            <div className="bg-purple-50/50 rounded-2xl p-4">
                                <div className="text-xs font-bold text-gray-500 mb-1">Растворы</div>
                                <div className="text-xl font-black text-purple-700">{data.productsSummary.solutions} шт.</div>
                            </div>
                            <div className="bg-rose-50/50 rounded-2xl p-4">
                                <div className="text-xs font-bold text-gray-500 mb-1">Консультации</div>
                                <div className="text-xl font-black text-rose-700">{data.productsSummary.consultations} шт.</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Selling Items block */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <ShoppingBag className="w-5 h-5 text-fuchsia-500" />
                        <h2 className="text-sm sm:text-base font-extrabold text-gray-800 uppercase tracking-tight">Позиции по продажам (Топ-15)</h2>
                    </div>

                    {topItems.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm font-medium">Нет данных о продажах</div>
                    ) : (
                        <div className="overflow-x-auto -mx-6 sm:mx-0">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="bg-gray-50/80 text-gray-400 font-extrabold text-[10px] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Наименование</th>
                                        <th className="px-4 py-3">Категория</th>
                                        <th className="px-4 py-3 text-center">Продано</th>
                                        <th className="px-6 py-3 text-right">Выручка</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {topItems.map((item: any, i: number) => (
                                        <React.Fragment key={i}>
                                            <tr 
                                                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                                onClick={() => setExpandedItem(expandedItem === item.name ? null : item.name)}
                                            >
                                                <td className="px-6 py-3.5 font-extrabold text-gray-800">
                                                    {item.name}
                                                </td>
                                                <td className="px-4 py-3.5 text-gray-500 font-medium">
                                                    {item.category}
                                                </td>
                                                <td className="px-4 py-3.5 text-center font-bold text-gray-600">
                                                    {item.quantity} шт.
                                                </td>
                                                <td className="px-6 py-3.5 text-right font-black text-indigo-700">
                                                    {fmt(item.value)} ₸
                                                </td>
                                            </tr>
                                            {expandedItem === item.name && item.salesHistory && item.salesHistory.length > 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-4 bg-gray-50/50">
                                                        <div className="space-y-3">
                                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">История продаж позиции</div>
                                                            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                                                                <table className="w-full text-left text-xs">
                                                                    <thead className="bg-gray-50 text-gray-400 font-semibold uppercase">
                                                                        <tr>
                                                                            <th className="px-4 py-2">Дата</th>
                                                                            <th className="px-4 py-2">№ Чека</th>
                                                                            <th className="px-4 py-2">Покупатель</th>
                                                                            <th className="px-4 py-2 text-center">Кол-во</th>
                                                                            <th className="px-4 py-2 text-right">Сумма</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-50">
                                                                        {item.salesHistory.map((sh: any, shi: number) => (
                                                                            <tr key={shi} className="hover:bg-gray-50">
                                                                                <td className="px-4 py-2 text-gray-500">{new Date(sh.date).toLocaleDateString('ru-RU')}</td>
                                                                                <td className="px-4 py-2 font-medium text-gray-700">{sh.saleNumber}</td>
                                                                                <td className="px-4 py-2 text-gray-700">
                                                                                    {sh.customerName || 'Без имени'}
                                                                                    {sh.customerPhone && <div className="text-[10px] text-gray-400">{sh.customerPhone}</div>}
                                                                                </td>
                                                                                <td className="px-4 py-2 text-center text-gray-600">{sh.quantity}</td>
                                                                                <td className="px-4 py-2 text-right font-bold text-gray-800">{fmt(sh.total)} ₸</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sales Dynamics Chart Representation */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="w-5 h-5 text-violet-500 animate-pulse" />
                        <h2 className="text-sm sm:text-base font-extrabold text-gray-800 uppercase tracking-tight">Динамика выручки</h2>
                    </div>

                    {dynamics.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm font-medium">Нет продаж для отображения динамики</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Graphic columns bar */}
                            <div className="flex items-end justify-between h-48 pt-4 gap-1.5 sm:gap-3 overflow-x-auto">
                                {dynamics.map((d: any, idx: number) => {
                                    const maxRev = Math.max(...dynamics.map((x: any) => x.revenue), 1);
                                    const percentHeight = Math.round((d.revenue / maxRev) * 100);
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center min-w-[20px] group cursor-pointer">
                                            <div className="w-full bg-violet-100 hover:bg-violet-600 rounded-lg relative transition-all duration-300" style={{ height: `${Math.max(percentHeight, 4)}%` }}>
                                                {d.revenue > 0 && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-gray-900 text-white text-[9px] font-black rounded-lg px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-30">
                                                        {fmt(d.revenue)} ₸
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-400 mt-2 rotate-45 sm:rotate-0 block">{d.date}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-xs text-gray-400 font-bold border-t border-gray-100 pt-3 flex justify-between items-center">
                                <span>Динамика продаж по дням</span>
                                <span>Максимальная выручка за день: {fmt(Math.max(...dynamics.map((x: any) => x.revenue), 0))} ₸</span>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
