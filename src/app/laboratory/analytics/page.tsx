'use client';

import { useState, useEffect } from 'react';
import {
    TrendingUp, Package, DollarSign, Activity, Calendar, Users, Briefcase
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ru } from 'date-fns/locale';

interface EngineerStat {
    name: string;
    inProgress: number;
    produced: number;
    transferred: number;
}

interface CreatorStat {
    name: string;
    totalLenses: number;
    totalPrice: number;
    types: Record<string, number>;
}

export default function AnalyticsPage() {
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(false);
    
    const [engineerData, setEngineerData] = useState<EngineerStat[]>([]);
    const [creatorData, setCreatorData] = useState<CreatorStat[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, [startDate, endDate]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });
            const res = await fetch(`/api/laboratory/analytics?${query.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            const data = await res.json();
            setEngineerData(data.engineerData);
            setCreatorData(data.creatorData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n: number) => n.toLocaleString('ru-RU');
    const fmtMoney = (n: number) => `${fmt(n)} ₸`;

    const totalInProgress = engineerData.reduce((acc, curr) => acc + curr.inProgress, 0);
    const totalProduced = engineerData.reduce((acc, curr) => acc + curr.produced, 0);
    const totalTransferred = engineerData.reduce((acc, curr) => acc + curr.transferred, 0);

    const totalLensesAll = creatorData.reduce((acc, curr) => acc + curr.totalLenses, 0);
    const totalRevenueAll = creatorData.reduce((acc, curr) => acc + curr.totalPrice, 0);

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
            {/* Header & Date Picker */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Аналитика производства</h1>
                    <p className="text-sm text-gray-500 mt-1">Отчеты по произведенным линзам и заказчикам</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(date as Date)}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        locale={ru}
                        dateFormat="dd.MM.yyyy"
                        className="text-sm font-medium text-gray-700 bg-transparent w-[90px] outline-none cursor-pointer"
                    />
                    <span className="text-gray-400">-</span>
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date as Date)}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        locale={ru}
                        dateFormat="dd.MM.yyyy"
                        className="text-sm font-medium text-gray-700 bg-transparent w-[90px] outline-none cursor-pointer"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center`}>
                                    <Activity className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">Линз в работе</p>
                            <p className="text-lg font-bold text-gray-900">{fmt(totalInProgress)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center`}>
                                    <Package className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">Произведено линз</p>
                            <p className="text-lg font-bold text-gray-900">{fmt(totalProduced)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center`}>
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">Передано линз</p>
                            <p className="text-lg font-bold text-gray-900">{fmt(totalTransferred)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center`}>
                                    <Users className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">Всего заказано линз</p>
                            <p className="text-lg font-bold text-gray-900">{fmt(totalLensesAll)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center`}>
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">Общая сумма заказов</p>
                            <p className="text-lg font-bold text-gray-900">{fmtMoney(totalRevenueAll)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Engineers Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-indigo-600" />
                                    Отчет по произведенным линзам (по инженерам)
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <th className="px-6 py-3">Инженер</th>
                                            <th className="px-6 py-3 text-center">В работе</th>
                                            <th className="px-6 py-3 text-center">Произведено</th>
                                            <th className="px-6 py-3 text-center">Передано</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {engineerData.map((e, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 text-sm font-medium text-gray-900">{e.name}</td>
                                                <td className="px-6 py-3 text-sm text-center text-blue-600 font-semibold">{e.inProgress}</td>
                                                <td className="px-6 py-3 text-sm text-center text-emerald-600 font-semibold">{e.produced}</td>
                                                <td className="px-6 py-3 text-sm text-center text-indigo-600 font-semibold">{e.transferred}</td>
                                            </tr>
                                        ))}
                                        {engineerData.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                                                    Нет данных за выбранный период
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {engineerData.length > 0 && (
                                        <tfoot className="bg-gray-50 border-t border-gray-200">
                                            <tr>
                                                <td className="px-6 py-3 text-sm font-bold text-gray-900">ИТОГО</td>
                                                <td className="px-6 py-3 text-sm text-center font-bold text-gray-900">{totalInProgress}</td>
                                                <td className="px-6 py-3 text-sm text-center font-bold text-gray-900">{totalProduced}</td>
                                                <td className="px-6 py-3 text-sm text-center font-bold text-gray-900">{totalTransferred}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        {/* Creators Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-emerald-600" />
                                    Аналитический отчет по заказам (по авторам)
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <th className="px-6 py-3">Кто оформил</th>
                                            <th className="px-6 py-3 text-center">Линз заказано</th>
                                            <th className="px-6 py-3">Типы линз</th>
                                            <th className="px-6 py-3 text-right">Общая сумма</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {creatorData.map((c, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                                                <td className="px-6 py-3 text-sm text-center text-gray-800 font-semibold">{c.totalLenses}</td>
                                                <td className="px-6 py-3 text-xs text-gray-500">
                                                    {Object.entries(c.types).map(([type, qty]) => (
                                                        <div key={type} className="whitespace-nowrap">
                                                            <span className="font-medium text-gray-700">{type}:</span> {qty} шт
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-right text-gray-900 font-semibold">{fmtMoney(c.totalPrice)}</td>
                                            </tr>
                                        ))}
                                        {creatorData.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                                                    Нет данных за выбранный период
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {creatorData.length > 0 && (
                                        <tfoot className="bg-gray-50 border-t border-gray-200">
                                            <tr>
                                                <td className="px-6 py-3 text-sm font-bold text-gray-900">ИТОГО</td>
                                                <td className="px-6 py-3 text-sm text-center font-bold text-gray-900">{totalLensesAll}</td>
                                                <td className="px-6 py-3"></td>
                                                <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">{fmtMoney(totalRevenueAll)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
