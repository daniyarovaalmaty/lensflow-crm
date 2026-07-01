'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Banknote, Calendar, ChevronDown, CheckCircle2, DollarSign, Calculator } from 'lucide-react';

const fmt = (num: number) => new Intl.NumberFormat('ru-RU').format(num);

export default function PayrollPage() {
    const { data: session } = useSession();

    // Отчет только за Июнь 2026 для доктора Айгерим Шораевой
    const isAigerim = session?.user?.name?.toLowerCase().includes('айгерим') || session?.user?.name?.toLowerCase().includes('шораева');

    if (!isAigerim) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                    <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Зарплатный проект</h2>
                    <p className="text-gray-500">В данный момент расчеты зарплаты доступны не для всех сотрудников.</p>
                </div>
            </div>
        );
    }

    const fittings = [
        { date: '02.06.2026', patient: 'Жанара', total: 300000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 250000, bonus: 75000 },
        { date: '02.06.2026', patient: 'Валерий Щапов', total: 150000, type: 'Обычная', lensCost: 25000, installDeduct: 0, base: 125000, bonus: 37500 },
        { date: '04.06.2026', patient: 'Аяна Орынгали', total: 253000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 203000, bonus: 60900 },
        { date: '05.06.2026', patient: 'Олжас', total: 320001, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 270001, bonus: 81000.3 },
        { date: '06.06.2026', patient: 'Арслан', total: 270000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 220000, bonus: 66000 },
        { date: '06.06.2026', patient: 'Силина шошина', total: 300000, type: 'Рассрочка', lensCost: 50000, installDeduct: 45000, base: 205000, bonus: 61500 },
        { date: '06.06.2026', patient: 'алижан', total: 300000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 250000, bonus: 75000 },
        { date: '09.06.2026', patient: 'Амир Торекелди', total: 300000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 250000, bonus: 75000 },
        { date: '12.06.2026', patient: 'Ерсултан', total: 300000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 250000, bonus: 75000 },
        { date: '13.06.2026', patient: 'Мирон', total: 253000, type: 'Рассрочка', lensCost: 50000, installDeduct: 37950, base: 165050, bonus: 49515 },
        { date: '13.06.2026', patient: 'Алтынай', total: 150000, type: 'Обычная', lensCost: 25000, installDeduct: 0, base: 125000, bonus: 37500 },
        { date: '16.06.2026', patient: 'Адиля', total: 300000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 250000, bonus: 75000 },
        { date: '16.06.2026', patient: 'Мария', total: 253000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 203000, bonus: 60900 },
        { date: '18.06.2026', patient: 'Ормирбек молдир', total: 130000, type: 'Обычная', lensCost: 25000, installDeduct: 0, base: 105000, bonus: 31500 },
        { date: '18.06.2026', patient: 'Асель', total: 300000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 250000, bonus: 75000 },
        { date: '19.06.2026', patient: 'Сафира', total: 338100, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 288100, bonus: 86430 },
        { date: '19.06.2026', patient: 'элиф', total: 273000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 223000, bonus: 66900 },
        { date: '23.06.2026', patient: 'Элиана', total: 227700, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 177700, bonus: 53310 },
        { date: '23.06.2026', patient: 'Мацковские Ксения и Анастасия', total: 570000, type: 'Обычная', lensCost: 100000, installDeduct: 0, base: 470000, bonus: 141000 },
        { date: '24.06.2026', patient: 'алисултан', total: 282500, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 232500, bonus: 69750 },
        { date: '24.06.2026', patient: 'айтолкын', total: 300000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 250000, bonus: 75000 },
        { date: '26.06.2026', patient: 'Кристина', total: 300000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 250000, bonus: 75000 },
        { date: '27.06.2026', patient: 'ганиева айниса', total: 253000, type: 'Обычная', lensCost: 50000, installDeduct: 0, base: 203000, bonus: 60900 },
    ];

    const consultations = [
        { date: '03.06.2026', patient: 'Баймужанова Алия', status: 'Оплачено', sum: 10000, bonus: 3000 },
        { date: '16.06.2026', patient: 'Марина Новичкова', status: 'Оплачено', sum: 5000, bonus: 1500 },
        { date: '19.06.2026', patient: 'Раиль Мадиев', status: 'Оплачено', sum: 15000, bonus: 4500 },
    ];

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Banknote className="w-7 h-7 text-emerald-600" />
                        Зарплатный проект
                    </h1>
                    <p className="text-gray-500 mt-1">Отчет за Июнь 2026 — Шораева Айгерим Аскаровна</p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 border border-emerald-100">
                    <CheckCircle2 className="w-5 h-5" />
                    К выплате: 1 773 605 ₸
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Calculator className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Оклад</p>
                    <h3 className="text-2xl font-bold text-gray-900">200 000 ₸</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <Banknote className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Бонус за подборы</p>
                    <h3 className="text-2xl font-bold text-gray-900">1 564 605 ₸</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium mb-1">Бонус за консультации</p>
                    <h3 className="text-2xl font-bold text-gray-900">9 000 ₸</h3>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        Детализация: Подборы ночных линз
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 font-medium">Дата</th>
                                <th className="px-4 py-3 font-medium">Пациент</th>
                                <th className="px-4 py-3 font-medium text-right">Сумма услуги</th>
                                <th className="px-4 py-3 font-medium">Оплата</th>
                                <th className="px-4 py-3 font-medium text-right text-red-500">Вычет линзы</th>
                                <th className="px-4 py-3 font-medium text-right text-red-500">Рассрочка (15%)</th>
                                <th className="px-4 py-3 font-medium text-right">База</th>
                                <th className="px-4 py-3 font-bold text-emerald-600 text-right">Бонус (30%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {fittings.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3 text-gray-500">{row.date}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{row.patient}</td>
                                    <td className="px-4 py-3 text-right">{fmt(row.total)} ₸</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${row.type === 'Рассрочка' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                            {row.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-red-500">- {fmt(row.lensCost)} ₸</td>
                                    <td className="px-4 py-3 text-right text-red-500">- {fmt(row.installDeduct)} ₸</td>
                                    <td className="px-4 py-3 text-right font-medium">{fmt(row.base)} ₸</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(Math.round(row.bonus))} ₸</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold text-gray-900">
                            <tr>
                                <td colSpan={7} className="px-4 py-3 text-right">Итого бонус за подборы:</td>
                                <td className="px-4 py-3 text-right text-emerald-600">1 564 605 ₸</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        Детализация: Первичные консультации
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 font-medium">Дата</th>
                                <th className="px-4 py-3 font-medium">Пациент</th>
                                <th className="px-4 py-3 font-medium">Оплата</th>
                                <th className="px-4 py-3 font-medium text-right">Сумма</th>
                                <th className="px-4 py-3 font-bold text-emerald-600 text-right">Бонус (30%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {consultations.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3 text-gray-500">{row.date}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{row.patient}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase">
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">{fmt(row.sum)} ₸</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(row.bonus)} ₸</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold text-gray-900">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right">Итого бонус за консультации:</td>
                                <td className="px-4 py-3 text-right text-emerald-600">9 000 ₸</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
        </div>
    );
}
