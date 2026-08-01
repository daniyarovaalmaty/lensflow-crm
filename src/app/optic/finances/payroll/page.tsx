'use client';

import { useState, useEffect, Fragment } from 'react';
import { Briefcase, ArrowLeft, Save, Play, Calendar as CalendarIcon, Check, X, Clock, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface StaffPayroll {
    user: { id: string; fullName: string; role: string; subRole?: string; isDoctor?: boolean };
    rule: { baseSalary: number; salesPercent: number };
    timesheet: {
        expectedDays: number;
        dailyRate: number;
        missedDays: number;
        deduction: number;
        finalBaseSal: number;
        scheduleType: string;
        attendance: any[];
    };
    periodSalesTotal: number;
    estimatedSalesBonus: number;
    totalEstimated: number;
    metrics?: any;
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function PayrollPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [staff, setStaff] = useState<StaffPayroll[]>([]);
    const [activeTab, setActiveTab] = useState<'payroll' | 'timesheet'>('payroll');
    
    // We only need month selection for Timesheet, so we use month/year state
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // Derive start/end date from currentMonth for the API
    const startDate = `${currentMonth}-01`;
    const endDate = new Date(parseInt(currentMonth.split('-')[0]), parseInt(currentMonth.split('-')[1]), 0).toISOString().split('T')[0];

    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ baseSalary: 0, salesPercent: 0, expectedDays: 15, scheduleType: '2/2' });
    const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);

    const fetchPayroll = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/optic/finances/payroll?start=${startDate}T00:00:00.000Z&end=${endDate}T23:59:59.999Z`);
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
    }, [currentMonth]);

    const handleSaveRule = async (userId: string) => {
        // Save both Rule (Salary/Percent) and Schedule (Days)
        await fetch('/api/optic/finances/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_rule', targetUserId: userId, baseSalary: editForm.baseSalary, salesPercent: editForm.salesPercent })
        });
        await fetch('/api/optic/finances/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_schedule', targetUserId: userId, scheduleType: editForm.scheduleType, expectedDays: editForm.expectedDays })
        });
        setEditingUserId(null);
        fetchPayroll();
    };

    const handleToggleAttendance = async (userId: string, dateStr: string, currentStatus: string | null) => {
        // Cycle: PRESENT -> ABSENT -> null
        let newStatus = 'PRESENT';
        if (currentStatus === 'PRESENT') newStatus = 'ABSENT';
        else if (currentStatus === 'ABSENT') {
            newStatus = 'PRESENT';
        }

        // Optimistic UI update
        setStaff(prev => prev.map(s => {
            if (s.user.id !== userId) return s;
            const newAttendance = [...s.timesheet.attendance];
            const idx = newAttendance.findIndex(a => new Date(a.date).toISOString().split('T')[0] === dateStr);
            if (idx >= 0) newAttendance[idx].status = newStatus;
            else newAttendance.push({ date: new Date(dateStr).toISOString(), status: newStatus });
            
            // Recalculate missed days temporarily
            const missed = newAttendance.filter(a => a.status === 'ABSENT').length;
            const deduction = missed * s.timesheet.dailyRate;
            return {
                ...s,
                timesheet: { ...s.timesheet, attendance: newAttendance, missedDays: missed, deduction, finalBaseSal: Math.max(0, s.rule.baseSalary - deduction) },
                totalEstimated: Math.max(0, s.rule.baseSalary - deduction) + s.estimatedSalesBonus
            };
        }));

        await fetch('/api/optic/finances/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_attendance', targetUserId: userId, date: dateStr, status: newStatus })
        });
    };

    const handleGeneratePayout = async (st: StaffPayroll) => {
        if (!confirm(`Начислить зарплату для ${st.user.fullName || 'Сотрудника'} на сумму ${fmt(st.totalEstimated)} ₸?`)) return;
        const res = await fetch('/api/optic/finances/payroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generate_payout', targetUserId: st.user.id, periodStart: `${startDate}T00:00:00.000Z`, periodEnd: `${endDate}T23:59:59.999Z`, baseAmount: st.timesheet.finalBaseSal, salesAmount: st.estimatedSalesBonus })
        });
        if (res.ok) alert('Зарплата начислена!');
    };

    const renderPayrollTable = () => (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                        <th className="px-6 py-4">Сотрудник</th>
                        <th className="px-6 py-4">Метрики приемов</th>
                        <th className="px-6 py-4">Условия (Оклад + %)</th>
                        <th className="px-6 py-4">График (Норма)</th>
                        <th className="px-6 py-4">Продажи</th>
                        <th className="px-6 py-4">Расчет ЗП</th>
                        <th className="px-6 py-4">Действия</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {staff.map(st => (
                        <Fragment key={st.user.id}>
                        <tr 
                            onClick={(e) => {
                                // Do not toggle if clicking on inputs or buttons
                                if ((e.target as HTMLElement).closest('input, button, .no-toggle')) return;
                                setExpandedDoctorId(expandedDoctorId === st.user.id ? null : st.user.id);
                            }}
                            className={`border-b border-gray-50 hover:bg-slate-50 transition-colors cursor-pointer ${expandedDoctorId === st.user.id ? 'bg-indigo-50/20' : ''}`}
                        >
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{st.user.fullName || 'Без имени'}</div>
                                <div className="text-xs text-gray-400 uppercase mt-0.5">{st.user.role}</div>
                            </td>
                            <td className="px-6 py-4">
                                {st.user.isDoctor && st.metrics ? (
                                    <div className="space-y-1 w-44">
                                        <div className="text-[10px] text-gray-600 grid grid-cols-2 gap-x-2 gap-y-1">
                                            <span className="text-gray-500">Консультации:</span>
                                            <span className="font-medium text-right">{st.metrics.consultations}</span>
                                            <span className="text-gray-500">Подборы:</span>
                                            <span className="font-medium text-right">{st.metrics.fittings}</span>
                                            {st.metrics.diagnostics > 0 && <><span className="text-gray-500">Диагностика:</span><span className="font-medium text-right">{st.metrics.diagnostics}</span></>}
                                            {st.metrics.stellest > 0 && <><span className="text-gray-500">Stellest:</span><span className="font-medium text-right">{st.metrics.stellest}</span></>}
                                            {st.metrics.gross > 0 && <><span className="text-gray-500">Gross:</span><span className="font-medium text-right">{st.metrics.gross}</span></>}
                                            {st.metrics.armost > 0 && <><span className="text-gray-500">Armost:</span><span className="font-medium text-right">{st.metrics.armost}</span></>}
                                            {st.metrics.tiedra > 0 && <><span className="text-gray-500">Tiedra:</span><span className="font-medium text-right">{st.metrics.tiedra}</span></>}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1.5 border-t border-gray-100 pt-1.5 flex items-center justify-between">
                                            <span>Перв: <span className="text-gray-600 font-medium">{st.metrics.primary}</span></span>
                                            <span>Повт: <span className="text-gray-600 font-medium">{st.metrics.secondary}</span></span>
                                        </div>
                                        {st.metrics.transactions && st.metrics.transactions.length > 0 && (
                                            <div className="mt-2 text-[10px] text-indigo-500 font-semibold flex items-center gap-1 group-hover:text-indigo-700">
                                                {expandedDoctorId === st.user.id ? 'Скрыть список чеков' : 'Нажмите, чтобы увидеть чеки'}
                                                {expandedDoctorId === st.user.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 italic">—</div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {editingUserId === st.user.id ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-1">
                                            <input type="number" className="w-20 border rounded px-1.5 py-1 text-xs" value={editForm.baseSalary} onChange={e => setEditForm({...editForm, baseSalary: Number(e.target.value)})} title="Оклад" />
                                            <span className="text-gray-400">+</span>
                                            <input type="number" className="w-16 border rounded px-1.5 py-1 text-xs" value={editForm.salesPercent} onChange={e => setEditForm({...editForm, salesPercent: Number(e.target.value)})} title="%" />
                                            <span className="text-gray-400">%</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input type="number" className="w-20 border rounded px-1.5 py-1 text-xs" value={editForm.expectedDays} onChange={e => setEditForm({...editForm, expectedDays: Number(e.target.value)})} title="Дней" />
                                            <span className="text-xs text-gray-500">дн.</span>
                                            <button onClick={() => handleSaveRule(st.user.id)} className="text-blue-600 hover:text-blue-800 ml-2 border border-blue-200 bg-blue-50 p-1 rounded">
                                                <Save className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                                        setEditingUserId(st.user.id);
                                        setEditForm({ baseSalary: st.rule.baseSalary, salesPercent: st.rule.salesPercent, expectedDays: st.timesheet?.expectedDays || 15, scheduleType: st.timesheet?.scheduleType || '2/2' });
                                    }}>
                                        <span className="font-medium text-gray-700">{fmt(st.rule.baseSalary)} ₸</span>
                                        <span className="text-gray-400">+</span>
                                        <span className="font-medium text-indigo-600">{st.rule.salesPercent}%</span>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-xs text-gray-600">Норма: <span className="font-medium">{st.timesheet?.expectedDays || 0} дн.</span></div>
                                <div className="text-xs text-gray-600">День: <span className="font-medium">{fmt(st.timesheet?.dailyRate || 0)} ₸</span></div>
                                {st.timesheet?.missedDays > 0 && (
                                    <div className="text-xs text-red-500 font-medium mt-1">Пропусков: {st.timesheet.missedDays}</div>
                                )}
                            </td>
                            <td className="px-6 py-4 font-mono text-gray-600 text-xs">
                                {fmt(st.periodSalesTotal)} ₸
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-xs text-gray-500 flex justify-between w-32"><span>Оклад:</span> <span>{fmt(st.rule.baseSalary)}</span></div>
                                {st.timesheet?.deduction > 0 && (
                                    <div className="text-xs text-red-500 flex justify-between w-32"><span>Штраф:</span> <span>-{fmt(st.timesheet.deduction)}</span></div>
                                )}
                                <div className="text-xs text-gray-500 flex justify-between w-32"><span>Бонус:</span> <span>{fmt(st.estimatedSalesBonus)}</span></div>
                                <div className="font-bold text-emerald-600 mt-1 text-base flex justify-between w-32"><span>Итого:</span> <span>{fmt(st.totalEstimated)} ₸</span></div>
                            </td>
                            <td className="px-6 py-4">
                                <button onClick={() => handleGeneratePayout(st)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors">
                                    <Play className="w-3 h-3 fill-current" /> Начислить
                                </button>
                            </td>
                        </tr>
                        {expandedDoctorId === st.user.id && st.metrics?.transactions && st.metrics.transactions.length > 0 && (
                            <tr className="bg-slate-50 border-b border-gray-100">
                                <td colSpan={7} className="px-6 py-6 relative">
                                    {/* Small arrow pointing up to the doctor row */}
                                    <div className="absolute top-0 left-[20%] -mt-2 w-4 h-4 bg-slate-50 border-t border-l border-gray-100 transform rotate-45"></div>
                                    
                                    <div className="w-full">
                                        <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                            <Receipt className="w-4 h-4 text-indigo-500" /> 
                                            Транзакции и оплаты пациентов
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                            {st.metrics.transactions.map((tx: any, idx: number) => (
                                                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all flex flex-col">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-semibold text-gray-800 text-xs truncate pr-2" title={tx.patientName}>
                                                            {tx.patientName || 'Неизвестный пациент'}
                                                        </div>
                                                        <div className="text-emerald-600 font-bold whitespace-nowrap text-sm">
                                                            {fmt(tx.saleAmount > 0 ? tx.saleAmount : tx.total)}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-[10px] text-gray-500 mb-3 truncate" title={tx.transactionName}>
                                                        {tx.transactionName || 'Оплата услуг/товаров'}
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                                                        <div className="text-[9px] text-gray-400 font-mono">
                                                            № {tx.saleNumber}
                                                        </div>
                                                        <button 
                                                            onClick={() => router.push(`/optic/sales-history?search=${tx.saleNumber}`)}
                                                            className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded"
                                                        >
                                                            Чек <Receipt className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderTimesheet = () => {
        // Calculate days in month
        const [year, month] = currentMonth.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const days = Array.from({length: daysInMonth}, (_, i) => {
            const d = i + 1;
            const dateObj = new Date(parseInt(year), parseInt(month)-1, d);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            return {
                day: d,
                dateStr: dateObj.toISOString().split('T')[0],
                isWeekend
            };
        });

        return (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs">
                        <tr>
                            <th className="px-4 py-3 sticky left-0 bg-gray-50 z-10 min-w-[200px] border-r border-gray-200">Сотрудник</th>
                            {days.map(d => (
                                <th key={d.day} className={`px-2 py-3 text-center min-w-[36px] ${d.isWeekend ? 'bg-red-50 text-red-400' : ''}`}>
                                    {d.day}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-right">Пропуски</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {staff.map(st => (
                            <tr key={st.user.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-200">
                                    <div className="font-bold text-gray-900">{st.user.fullName || 'Без имени'}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{st.timesheet?.scheduleType} (Норма: {st.timesheet?.expectedDays} дн)</div>
                                </td>
                                {days.map(d => {
                                    const record = st.timesheet?.attendance?.find((a: any) => new Date(a.date).toISOString().split('T')[0] === d.dateStr);
                                    let statusColor = 'hover:bg-gray-100';
                                    let icon = null;
                                    
                                    if (record?.status === 'PRESENT') {
                                        statusColor = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600';
                                        icon = <Check className="w-4 h-4 mx-auto" />;
                                    } else if (record?.status === 'ABSENT') {
                                        statusColor = 'bg-red-50 hover:bg-red-100 text-red-600';
                                        icon = <X className="w-4 h-4 mx-auto" />;
                                    }

                                    return (
                                        <td key={d.day} 
                                            onClick={() => handleToggleAttendance(st.user.id, d.dateStr, record?.status || null)}
                                            className={`p-1 cursor-pointer transition-colors border-r border-gray-50 ${statusColor}`}>
                                            <div className="w-full h-8 flex items-center justify-center rounded">
                                                {icon}
                                            </div>
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-3 text-right font-medium text-red-600 bg-red-50/30">
                                    {st.timesheet?.missedDays > 0 ? st.timesheet.missedDays : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <Link href="/optic/finances" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 mb-1">
                                <ArrowLeft className="w-3.5 h-3.5" /> Назад к Финансам
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase className="w-6 h-6 text-indigo-600" /> Зарплата и Табель
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button onClick={() => setActiveTab('payroll')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'payroll' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Расчет ЗП</button>
                                <button onClick={() => setActiveTab('timesheet')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'timesheet' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <CalendarIcon className="w-4 h-4" /> Табель
                                </button>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                                <input type="month" value={currentMonth} onChange={e => setCurrentMonth(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-8">
                {loading ? (
                    <div className="text-center py-10 flex flex-col items-center">
                        <Clock className="w-8 h-8 text-gray-300 animate-spin mb-4" />
                        <span className="text-gray-500">Загрузка данных...</span>
                    </div>
                ) : (
                    activeTab === 'payroll' ? renderPayrollTable() : renderTimesheet()
                )}
            </div>
        </div>
    );
}
