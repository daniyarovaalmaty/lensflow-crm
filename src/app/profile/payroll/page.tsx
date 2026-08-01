'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Banknote, Calculator, Calendar, Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import QuickNav from '@/components/ui/QuickNav';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'KZT',
        maximumFractionDigits: 0,
    }).format(value);
};

export default function EmployeePayrollPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [payrollData, setPayrollData] = useState<any>(null);
    
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const startDate = `${currentMonth}-01`;
    const endDate = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).toISOString().split('T')[0];

    useEffect(() => {
        const fetchMyPayroll = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/optic/finances/payroll?my=true&start=${startDate}T00:00:00.000Z&end=${endDate}T23:59:59.999Z`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.staffPayroll && data.staffPayroll.length > 0) {
                        setPayrollData(data.staffPayroll[0]);
                    } else {
                        setPayrollData(null);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchMyPayroll();
    }, [currentMonth]);

    const formatMonthName = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-surface">
            <QuickNav />
            
            <div className="bg-surface-elevated border-b border-border">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-emerald-600" />
                                Моя Зарплата
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Детализация начислений и удержаний
                            </p>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-xl border border-gray-200/60 shadow-sm">
                            <Calendar className="w-4 h-4 text-gray-400 ml-2" />
                            <input 
                                type="month" 
                                value={currentMonth}
                                onChange={(e) => setCurrentMonth(e.target.value)}
                                className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 py-1"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40">
                        <Clock className="w-8 h-8 text-gray-300 animate-spin mb-4" />
                        <span className="text-sm text-gray-500">Загрузка данных...</span>
                    </div>
                ) : !payrollData ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                        <AlertCircle className="w-10 h-10 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Нет данных</h3>
                        <p className="text-sm text-gray-500 max-w-sm mt-1">В этом месяце для вас не настроен оклад или нет записей о продажах.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Card */}
                        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <DollarSign className="w-48 h-48 -rotate-12" />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-emerald-100 text-sm font-medium uppercase tracking-wider mb-2">К выплате ({formatMonthName(currentMonth)})</h2>
                                <div className="text-4xl sm:text-5xl font-bold mb-6">
                                    {formatCurrency(payrollData.totalEstimated)}
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-emerald-500/30 pt-6 mt-6">
                                    <div>
                                        <div className="text-emerald-100 text-xs mb-1">Итоговый оклад</div>
                                        <div className="text-xl font-semibold">{formatCurrency(payrollData.timesheet?.finalBaseSal || 0)}</div>
                                    </div>
                                    <div>
                                        <div className="text-emerald-100 text-xs mb-1">Бонусы с продаж</div>
                                        <div className="text-xl font-semibold">+{formatCurrency(payrollData.estimatedSalesBonus || 0)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Timesheet Details */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-500" /> Табель (Оклад)
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-gray-500 text-sm">Базовый оклад</span>
                                        <span className="font-medium text-gray-900">{formatCurrency(payrollData.rule?.baseSalary || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-gray-500 text-sm">График работы</span>
                                        <span className="font-medium text-gray-900">{payrollData.timesheet?.scheduleType}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-gray-500 text-sm">Норма дней в месяц</span>
                                        <span className="font-medium text-gray-900">{payrollData.timesheet?.expectedDays} дн.</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-gray-500 text-sm">Стоимость 1 дня</span>
                                        <span className="font-medium text-gray-900">{formatCurrency(payrollData.timesheet?.dailyRate || 0)}</span>
                                    </div>
                                    
                                    {payrollData.timesheet?.missedDays > 0 && (
                                        <div className="bg-red-50 p-4 rounded-xl mt-4 border border-red-100">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-red-600 text-sm font-medium">Пропущено дней: {payrollData.timesheet.missedDays}</span>
                                                <span className="text-red-700 font-bold">-{formatCurrency(payrollData.timesheet.deduction)}</span>
                                            </div>
                                            <p className="text-xs text-red-500">Сумма удержана из базового оклада.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sales Details */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-500" /> Продажи (Бонусы)
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-gray-500 text-sm">Личные продажи</span>
                                        <span className="font-medium text-gray-900">{formatCurrency(payrollData.periodSalesTotal || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-gray-500 text-sm">Ваш процент (%)</span>
                                        <span className="font-medium text-blue-600">{payrollData.rule?.salesPercent}%</span>
                                    </div>
                                    
                                    {payrollData.metrics && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Статистика приемов</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="text-xs text-gray-500 mb-1">Консультации</div>
                                                    <div className="text-lg font-bold text-gray-900">{payrollData.metrics.consultations || 0}</div>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="text-xs text-gray-500 mb-1">Подборы</div>
                                                    <div className="text-lg font-bold text-gray-900">{payrollData.metrics.fittings || 0}</div>
                                                </div>
                                            </div>
                                            {(payrollData.metrics.diagnostics > 0 || payrollData.metrics.stellest > 0 || payrollData.metrics.gross > 0 || payrollData.metrics.armost > 0 || payrollData.metrics.tiedra > 0) && (
                                                <div className="grid grid-cols-3 gap-3 mt-3">
                                                    {payrollData.metrics.diagnostics > 0 && <div className="bg-gray-50 rounded p-2 text-center"><div className="text-[10px] text-gray-500">Диагностика</div><div className="font-bold">{payrollData.metrics.diagnostics}</div></div>}
                                                    {payrollData.metrics.stellest > 0 && <div className="bg-gray-50 rounded p-2 text-center"><div className="text-[10px] text-gray-500">Stellest</div><div className="font-bold">{payrollData.metrics.stellest}</div></div>}
                                                    {payrollData.metrics.gross > 0 && <div className="bg-gray-50 rounded p-2 text-center"><div className="text-[10px] text-gray-500">Gross</div><div className="font-bold">{payrollData.metrics.gross}</div></div>}
                                                    {payrollData.metrics.armost > 0 && <div className="bg-gray-50 rounded p-2 text-center"><div className="text-[10px] text-gray-500">Armost</div><div className="font-bold">{payrollData.metrics.armost}</div></div>}
                                                    {payrollData.metrics.tiedra > 0 && <div className="bg-gray-50 rounded p-2 text-center"><div className="text-[10px] text-gray-500">Tiedra</div><div className="font-bold">{payrollData.metrics.tiedra}</div></div>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {payrollData.metrics?.transactions && payrollData.metrics.transactions.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    Детализация транзакций (продажи)
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                            <tr>
                                                <th className="px-4 py-3">Дата</th>
                                                <th className="px-4 py-3">Пациент</th>
                                                <th className="px-4 py-3">Товар / Услуга</th>
                                                <th className="px-4 py-3 text-right">Сумма</th>
                                                <th className="px-4 py-3 text-right">Себестоимость</th>
                                                <th className="px-4 py-3 text-right">Комиссия банка</th>
                                                <th className="px-4 py-3 text-right">Итого (база)</th>
                                                <th className="px-4 py-3 text-right text-indigo-700">Бонус</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {payrollData.metrics.transactions.map((tx: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(tx.date).toLocaleDateString('ru-RU')}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-900">{tx.patientName}</td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {tx.itemName}
                                                        {tx.isInstallment && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">Рассрочка</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                                        {formatCurrency(tx.saleAmount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-gray-500">
                                                        {formatCurrency(tx.totalCost)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-gray-500">
                                                        {formatCurrency(tx.bankFee)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-gray-700 font-medium">
                                                        {formatCurrency(tx.netIncome)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-indigo-600">
                                                        {formatCurrency(tx.bonus)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
