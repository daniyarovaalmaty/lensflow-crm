'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Banknote, Calculator, DollarSign, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { payrollData } from './data';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(value);
};

const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
};

export default function PayrollPage() {
    const { data: session } = useSession();

    // Отчет только для доктора Айгерим Шораевой
    const isAigerim = session?.user?.name?.toLowerCase().includes('айгерим') || session?.user?.name?.toLowerCase().includes('шораева');

    // Получаем доступные месяцы из данных, сортируем по убыванию
    const availableMonths = Object.keys(payrollData).sort((a, b) => b.localeCompare(a));
    const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || '');

    if (!isAigerim) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-md mx-auto space-y-4">
                <div className="p-4 bg-amber-50 rounded-full">
                    <Banknote className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-xl font-medium text-gray-900">Доступ ограничен</h2>
                <p className="text-gray-500">
                    В данный момент детальные расчеты зарплаты отображаются только для тестовых аккаунтов.
                </p>
            </div>
        );
    }

    const currentData = (payrollData as any)[selectedMonth] || [];
    
    const oklad = 200000;
    
    // Категоризация бонусов:
    const consultations = currentData.filter((d: any) => d.service.toLowerCase().includes('консультация') || d.service.toLowerCase().includes('вгд'));
    const consultationsBonus = consultations.reduce((a: any, b: any) => a + b.bonus, 0);

    const fittings = currentData.filter((d: any) => !d.service.toLowerCase().includes('консультация') && !d.service.toLowerCase().includes('вгд'));
    const fittingsBonus = fittings.reduce((a: any, b: any) => a + b.bonus, 0);

    const totalBonus = fittingsBonus + consultationsBonus;
    const totalToPay = oklad + totalBonus;

    // Подготовка данных для графика (история по всем доступным месяцам)
    const chartData = availableMonths.map(month => {
        const monthData = (payrollData as any)[month] || [];
        const bonus = monthData.reduce((acc: number, row: any) => acc + row.bonus, 0);
        return {
            month,
            label: formatMonth(month),
            total: oklad + bonus,
            bonus: bonus
        };
    }).reverse(); // Для графика от старых к новым

    // Находим максимум для шкалы графика
    const maxChartValue = Math.max(...chartData.map(d => d.total), oklad * 2);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                            <Banknote className="w-6 h-6" />
                        </div>
                        Дашборд Зарплаты
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        Шораева Айгерим Аскаровна
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                        <Calendar className="w-4 h-4 text-gray-400 ml-2" />
                        <select 
                            className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 py-1.5 cursor-pointer capitalize"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {availableMonths.map(month => (
                                <option key={month} value={month}>{formatMonth(month)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Total Payout KPI */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-emerald-100 font-medium text-sm tracking-wide uppercase">К выплате за {formatMonth(selectedMonth)}</p>
                                <h2 className="text-4xl font-bold mt-2">{formatCurrency(totalToPay)}</h2>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-emerald-50 font-medium bg-black/10 w-fit px-3 py-1.5 rounded-lg">
                            <span>Оклад: {formatCurrency(oklad)}</span>
                            <span className="w-1 h-1 rounded-full bg-white/50"></span>
                            <span>Бонусы: {formatCurrency(totalBonus)}</span>
                        </div>
                    </div>
                </div>

                {/* Sales KPI */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-gray-500 font-medium text-sm tracking-wide uppercase">Выполнение KPI по продажам</p>
                            <h2 className="text-2xl font-bold text-gray-900 mt-2">План перевыполнен</h2>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-sm font-semibold">
                            <ArrowUpRight className="w-4 h-4" />
                            +20%
                        </div>
                        <span className="text-sm text-gray-500">к прошлому месяцу (по личным продажам)</span>
                    </div>
                </div>
            </div>

            {/* Breakdown & Chart Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Details Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
                        <h3 className="text-base font-semibold text-gray-900 mb-6">Структура дохода</h3>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Оклад
                                    </span>
                                    <span className="font-medium text-gray-900">{formatCurrency(oklad)}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(oklad / totalToPay) * 100}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div> Подборы линз
                                    </span>
                                    <span className="font-medium text-gray-900">{formatCurrency(fittingsBonus)}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(fittingsBonus / totalToPay) * 100}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> Консультации
                                    </span>
                                    <span className="font-medium text-gray-900">{formatCurrency(consultationsBonus)}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(consultationsBonus / totalToPay) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History Chart */}
                <div className="lg:col-span-2 p-6 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col">
                    <h3 className="text-base font-semibold text-gray-900 mb-6">Динамика ЗП по месяцам</h3>
                    <div className="flex-1 flex items-end justify-around gap-4 mt-auto pt-8 border-b border-gray-100 pb-4 h-48">
                        {chartData.length === 0 && (
                            <div className="w-full text-center text-gray-400 text-sm pb-8">Нет данных для графика</div>
                        )}
                        {chartData.map((data, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-3 w-16 group">
                                <div className="relative w-full flex justify-center h-full items-end">
                                    {/* Tooltip on hover */}
                                    <div className="absolute -top-10 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                        {formatCurrency(data.total)}
                                    </div>
                                    <div 
                                        className={`w-full rounded-t-md transition-all duration-500 ${data.month === selectedMonth ? 'bg-emerald-500' : 'bg-emerald-200 group-hover:bg-emerald-300'}`}
                                        style={{ height: `${(data.total / maxChartValue) * 100}%`, minHeight: '10%' }}
                                    ></div>
                                </div>
                                <span className="text-xs font-medium text-gray-500 capitalize">{data.label.split(' ')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="border border-gray-100 shadow-sm overflow-hidden bg-white rounded-2xl">
                <div className="px-6 py-5 border-b border-gray-100 bg-white">
                    <h3 className="font-semibold text-gray-900">Детализация: Все услуги ({formatMonth(selectedMonth)})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 font-medium tracking-wider">Дата</th>
                                <th className="px-6 py-4 font-medium tracking-wider">Пациент</th>
                                <th className="px-6 py-4 font-medium tracking-wider">Услуга</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right">Оплата</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right text-rose-400">Вычет линзы</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right text-rose-400">Рассрочка</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right text-gray-500">База</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right text-emerald-600">Бонус (30%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentData.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Нет данных за выбранный месяц</td>
                                </tr>
                            )}
                            {currentData.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-gray-500">{row.date}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 capitalize">{row.patient}</td>
                                    <td className="px-6 py-4 text-gray-600">{row.service}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="font-medium text-gray-900">{formatCurrency(row.cost)}</span>
                                            {row.isRassrochka && (
                                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 bg-orange-100/50 text-orange-700 text-[10px] uppercase font-semibold">
                                                    Рассрочка
                                                </span>
                                            )}
                                            {!row.isRassrochka && (
                                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 bg-emerald-100/50 text-emerald-700 text-[10px] uppercase font-semibold">
                                                    Обычная
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-rose-500">
                                        {row.lensCost > 0 ? `- ${formatCurrency(row.lensCost)}` : '- 0 ₸'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-rose-500">
                                        {row.bankPct > 0 ? `- ${formatCurrency(row.bankPct)}` : '- 0 ₸'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                                        {formatCurrency(row.base)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                        {formatCurrency(row.bonus)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
