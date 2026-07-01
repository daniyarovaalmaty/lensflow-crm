'use client';

import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, Calculator, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { payrollData } from './data';

export default function PayrollPage() {
    const { data: session } = useSession();

    // Отчет только за Июнь 2026 для доктора Айгерим Шораевой
    const isAigerim = session?.user?.name?.toLowerCase().includes('айгерим') || session?.user?.name?.toLowerCase().includes('шораева');

    if (!isAigerim) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-md mx-auto space-y-4">
                <div className="p-4 bg-amber-50 rounded-full">
                    <Banknote className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-xl font-medium text-gray-900">Доступ ограничен</h2>
                <p className="text-gray-500">
                    В данный момент детальные расчеты зарплаты отображаются только для тестовых аккаунтов. В скором времени они будут доступны для всех сотрудников.
                </p>
            </div>
        );
    }

    const oklad = 200000;
    
    // Категоризация бонусов:
    // Консультации / ВГД
    const consultations = payrollData.filter(d => d.service.toLowerCase().includes('консультация') || d.service.toLowerCase().includes('вгд'));
    const consultationsBonus = consultations.reduce((a, b) => a + b.bonus, 0);

    // Подборы и другие услуги (линзы, годы, артмост)
    const fittings = payrollData.filter(d => !d.service.toLowerCase().includes('консультация') && !d.service.toLowerCase().includes('вгд'));
    const fittingsBonus = fittings.reduce((a, b) => a + b.bonus, 0);

    const totalBonus = fittingsBonus + consultationsBonus;
    const totalToPay = oklad + totalBonus;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <Banknote className="w-6 h-6 text-emerald-600" />
                        Зарплатный проект
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Отчет за Июнь 2026 — Шораева Айгерим Аскаровна
                    </p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-2xl flex items-center gap-3 border border-emerald-100 shadow-sm">
                    <div className="bg-emerald-100 p-2 rounded-xl">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-emerald-600/80 uppercase tracking-wider">К выплате</p>
                        <p className="text-xl font-bold">{formatCurrency(totalToPay)}</p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-100/50 bg-white/50 backdrop-blur-sm">
                    <div className="flex flex-col gap-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl w-fit">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 mt-2">Оклад</p>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(oklad)}</p>
                    </div>
                </Card>
                <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-100/50 bg-white/50 backdrop-blur-sm">
                    <div className="flex flex-col gap-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl w-fit">
                            <Banknote className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 mt-2">Бонус за подборы и услуги</p>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(fittingsBonus)}</p>
                    </div>
                </Card>
                <Card className="p-6 border-0 shadow-sm ring-1 ring-gray-100/50 bg-white/50 backdrop-blur-sm">
                    <div className="flex flex-col gap-2">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl w-fit">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 mt-2">Бонус за консультации</p>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(consultationsBonus)}</p>
                    </div>
                </Card>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm ring-1 ring-gray-100/50 overflow-hidden bg-white">
                <div className="px-6 py-5 border-b border-gray-100/80 bg-gray-50/50">
                    <h3 className="font-medium text-gray-900">Детализация: Все услуги (Июнь)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-50/30">
                            <tr>
                                <th className="px-6 py-4 font-medium tracking-wider">Дата</th>
                                <th className="px-6 py-4 font-medium tracking-wider">Пациент</th>
                                <th className="px-6 py-4 font-medium tracking-wider">Услуга</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right">Оплата</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right text-rose-400">Вычет линзы</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right text-rose-400">Рассрочка (15%)</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right text-gray-500">База</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right text-emerald-600">Бонус (30%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100/80">
                            {payrollData.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-gray-500">{row.date}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 capitalize">{row.patient}</td>
                                    <td className="px-6 py-4 text-gray-600">{row.service}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="font-medium text-gray-900">{formatCurrency(row.cost)}</span>
                                            {row.isRassrochka && (
                                                <Badge variant="secondary" className="bg-orange-100/50 text-orange-700 text-[10px] uppercase tracking-wider font-semibold">
                                                    Рассрочка
                                                </Badge>
                                            )}
                                            {!row.isRassrochka && (
                                                <Badge variant="secondary" className="bg-emerald-100/50 text-emerald-700 text-[10px] uppercase tracking-wider font-semibold">
                                                    Обычная
                                                </Badge>
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
                            {/* Total Row */}
                            <tr className="bg-emerald-50/30">
                                <td colSpan={7} className="px-6 py-4 text-right font-bold text-gray-900">
                                    Итого бонусы за Июнь:
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600 text-lg border-l border-emerald-100/50">
                                    {formatCurrency(totalBonus)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
