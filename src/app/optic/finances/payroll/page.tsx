'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ArrowLeft, Save, Play, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface StaffPayroll {
    user: { id: string; fullName: string; role: string; subRole?: string; isDoctor?: boolean };
    rule: { baseSalary: number; salesPercent: number };
    periodSalesTotal: number;
    estimatedSalesBonus: number;
    totalEstimated: number;
    metrics?: {
        consultations: number;
        fittings: number;
        primary: number;
        secondary: number;
        fittingDetails?: any[];
    };
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function PayrollPage() {
    const [loading, setLoading] = useState(true);
    const [staff, setStaff] = useState<StaffPayroll[]>([]);
    
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    });
    
    // For editing rules
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ baseSalary: 0, salesPercent: 0 });
    
    // State to toggle fitting details
    const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);

    const fetchPayroll = async () => {
        setLoading(true);
        try {
            let q = '';
            if (startDate && endDate) {
                q = `?start=${startDate}T00:00:00.000Z&end=${endDate}T23:59:59.999Z`;
            }
            const res = await fetch('/api/optic/finances/payroll' + q);
            if (res.ok) {
                const data = await res.json();
                setStaff(data.staffPayroll);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayroll();
    }, [startDate, endDate]);

    const handleSaveRule = async (userId: string) => {
        const res = await fetch('/api/optic/finances/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_rule',
                targetUserId: userId,
                baseSalary: editForm.baseSalary,
                salesPercent: editForm.salesPercent
            })
        });
        if (res.ok) {
            setEditingUserId(null);
            fetchPayroll();
        }
    };

    const handleGeneratePayout = async (st: StaffPayroll) => {
        if (!confirm(`Начислить зарплату для ${st.user.fullName || 'Сотрудника'} на сумму ${fmt(st.totalEstimated)} ₸?`)) return;
        
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const res = await fetch('/api/optic/finances/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'generate_payout',
                targetUserId: st.user.id,
                periodStart: firstDay,
                periodEnd: lastDay,
                baseAmount: st.rule.baseSalary,
                salesAmount: st.estimatedSalesBonus
            })
        });

        if (res.ok) {
            alert('Зарплата успешно начислена (добавлена в ведомость)! Не забудьте потом провести фактическую выплату со счета.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <Link href="/optic/finances" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 mb-2">
                                <ArrowLeft className="w-3.5 h-3.5" /> Назад к Финансам
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase className="w-6 h-6 text-indigo-600" /> Зарплатный Калькулятор
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">Настройте оклады и процент с продаж. Калькулятор автоматически посчитает ЗП за выбранный период.</p>
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} 
                                className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                            <span className="text-gray-500">-</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} 
                                className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
                {loading ? (
                    <div className="text-center py-10">Загрузка...</div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4">Сотрудник</th>
                                    <th className="px-6 py-4">Метрики приемов</th>
                                    <th className="px-6 py-4">Условия (Оклад + %)</th>
                                    <th className="px-6 py-4">Продажи (Тек. месяц)</th>
                                    <th className="px-6 py-4">Расчет ЗП</th>
                                    <th className="px-6 py-4">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {staff.map(st => (
                                    <tr key={st.user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{st.user.fullName || 'Без имени'}</div>
                                            <div className="text-xs text-gray-400 uppercase mt-0.5">{st.user.role}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {st.user.isDoctor && st.metrics ? (
                                                <div className="space-y-1 w-40">
                                                    <div className="text-xs text-gray-600 flex items-center justify-between">
                                                        <span>Консультации:</span>
                                                        <span className="font-medium">{st.metrics.consultations}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-600 flex items-center justify-between">
                                                        <span>Подборы:</span>
                                                        <span className="font-medium">{st.metrics.fittings}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1.5 border-t border-gray-100 pt-1.5 flex items-center justify-between">
                                                        <span>Перв: <span className="text-gray-600 font-medium">{st.metrics.primary}</span></span>
                                                        <span>Повт: <span className="text-gray-600 font-medium">{st.metrics.secondary}</span></span>
                                                    </div>
                                                    {st.metrics.fittingDetails && st.metrics.fittingDetails.length > 0 && (
                                                        <div className="mt-2 border-t border-gray-100 pt-2">
                                                            <button 
                                                                onClick={() => setExpandedDoctorId(expandedDoctorId === st.user.id ? null : st.user.id)}
                                                                className="text-[10px] text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
                                                            >
                                                                {expandedDoctorId === st.user.id ? 'Скрыть список подборов' : 'Показать список подборов'}
                                                            </button>
                                                            {expandedDoctorId === st.user.id && (
                                                                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                                                    {st.metrics.fittingDetails.map((fd: any, idx: number) => (
                                                                        <div key={idx} className="bg-gray-50 rounded p-1.5 text-[10px] flex flex-col gap-0.5 border border-gray-100">
                                                                            <div className="flex justify-between items-start text-gray-700 font-medium">
                                                                                <div className="flex flex-col">
                                                                                    <span className="truncate w-24 text-[9px] text-gray-500 font-normal mb-0.5" title={fd.patientName}>{fd.patientName}</span>
                                                                                    <span className="truncate w-24" title={fd.fittingName}>{fd.fittingName}</span>
                                                                                </div>
                                                                                <span className={fd.saleAmount > 0 ? 'text-emerald-600 font-bold' : 'text-gray-400'}>{fmt(fd.saleAmount)} ₸</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-gray-400">
                                                                                <span>{new Date(fd.date).toLocaleDateString('ru-RU')}</span>
                                                                                {fd.isInstallment && <span className="text-orange-500 font-bold bg-orange-50 px-1 rounded">Рассрочка</span>}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-400 italic">—</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingUserId === st.user.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input type="number" className="w-20 border rounded px-2 py-1 text-xs" 
                                                        value={editForm.baseSalary} onChange={e => setEditForm({...editForm, baseSalary: Number(e.target.value)})} placeholder="Оклад" />
                                                    <span className="text-gray-400">+</span>
                                                    <input type="number" className="w-16 border rounded px-2 py-1 text-xs" 
                                                        value={editForm.salesPercent} onChange={e => setEditForm({...editForm, salesPercent: Number(e.target.value)})} placeholder="%" />
                                                    <span className="text-gray-400">%</span>
                                                    <button onClick={() => handleSaveRule(st.user.id)} className="text-blue-600 hover:text-blue-800 ml-2">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                                                    setEditingUserId(st.user.id);
                                                    setEditForm({ baseSalary: st.rule.baseSalary, salesPercent: st.rule.salesPercent });
                                                }}>
                                                    <span className="font-medium text-gray-700">{fmt(st.rule.baseSalary)} ₸</span>
                                                    <span className="text-gray-400">+</span>
                                                    <span className="font-medium text-indigo-600">{st.rule.salesPercent}%</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">
                                            {fmt(st.periodSalesTotal)} ₸
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-500">Оклад: {fmt(st.rule.baseSalary)}</div>
                                            <div className="text-xs text-gray-500">Бонус: {fmt(st.estimatedSalesBonus)}</div>
                                            <div className="font-bold text-emerald-600 mt-1 text-base">Итого: {fmt(st.totalEstimated)} ₸</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleGeneratePayout(st)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors">
                                                <Play className="w-3 h-3 fill-current" /> Начислить ЗП
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
