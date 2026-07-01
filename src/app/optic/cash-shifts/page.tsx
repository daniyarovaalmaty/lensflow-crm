'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Banknote, CreditCard, ArrowLeftRight, CheckCircle2, AlertTriangle, 
    ArrowLeft, Lock, Unlock, ArrowDownToLine, ArrowUpFromLine, Clock, 
    FileText, User, Info, Smartphone, RefreshCw, X, Check, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { getEffectiveClinicPermissions } from '@/types/user';
import AccessDenied from '@/components/ui/AccessDenied';

// ==================== Interfaces ====================
interface Register {
    id: string;
    name: string;
    currentBalance: number;
}

interface Tx {
    id: string;
    trans_type: 'income' | 'expense' | 'cash_in' | 'cash_out';
    payment_method: string;
    category: string;
    amount: number;
    created_by_name: string;
    created_at: string;
    description?: string;
    kaspi_transaction_id?: string;
    kaspi_status?: string;
}

interface Shift {
    id: string;
    cash_register_name: string;
    cash_register_id: string;
    opened_by_name: string;
    status: 'open' | 'closed';
    starting_cash: number;
    expected_cash: number;
    opened_at: string;
    transactions?: Tx[];
}

interface HistoryShift {
    id: string;
    cash_register_name: string;
    opened_by_name: string;
    closed_by_name: string;
    starting_cash: number;
    expected_cash: number;
    actual_cash: number;
    discrepancy: number;
    opened_at: string;
    closed_at: string;
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function CashShiftsPage() {
    const { data: session } = useSession();

    // permissions visibility check
    const clinicPerms = session?.user ? getEffectiveClinicPermissions({
        subRole: session.user.subRole,
        permissions: session.user.permissions,
    }) : null;

    const [loading, setLoading] = useState(true);
    const [registers, setRegisters] = useState<Register[]>([]);
    const [activeShift, setActiveShift] = useState<Shift | null>(null);
    const [historyShifts, setHistoryShifts] = useState<HistoryShift[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modals
    const [openShiftOpen, setOpenShiftOpen] = useState(false);
    const [closeShiftOpen, setCloseShiftOpen] = useState(false);
    const [txDialogOpen, setTxDialogOpen] = useState(false);
    const [kaspiDialogOpen, setKaspiDialogOpen] = useState(false);

    // Form inputs
    const [selectedRegister, setSelectedRegister] = useState('');
    const [startingCash, setStartingCash] = useState('10000');
    const [actualCash, setActualCash] = useState('');

    // Manual Tx Form
    const [txForm, setTxForm] = useState({
        trans_type: 'cash_in',
        amount: '',
        payment_method: 'cash',
        category: 'other',
        description: ''
    });

    // Kaspi Simulator State
    const [kaspiAmount, setKaspiAmount] = useState('15000');
    const [kaspiOrderId, setKaspiOrderId] = useState('1085');
    const [kaspiStatus, setKaspiStatus] = useState<'idle' | 'triggering' | 'pending' | 'success' | 'failed'>('idle');
    const [kaspiTxId, setKaspiTxId] = useState('');

    const loadRegistersAndShifts = useCallback(async () => {
        setLoading(true);
        try {
            // Load cash registers
            const regRes = await fetch('/api/optic/cash-registers');
            if (regRes.ok) {
                const regData = await regRes.json();
                setRegisters(regData);
                if (regData.length > 0) {
                    setSelectedRegister(regData[0].id);
                }
            }

            // Load active shift
            const shiftRes = await fetch('/api/optic/cash-shifts');
            if (shiftRes.ok) {
                const shiftData = await shiftRes.json();
                setActiveShift(shiftData);
            }

            // Load shift history
            const histRes = await fetch('/api/optic/cash-shifts/history');
            if (histRes.ok) {
                const histData = await histRes.json();
                setHistoryShifts(histData);
            }
        } catch (err) {
            setError('Ошибка при загрузке кассовых данных');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRegistersAndShifts();
    }, [loadRegistersAndShifts]);

    const handleOpenShift = async () => {
        if (!selectedRegister || !startingCash) {
            setError('Пожалуйста, выберите кассу и введите стартовую сумму');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/optic/cash-shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cashRegisterId: selectedRegister,
                    startingCash: parseFloat(startingCash),
                }),
            });

            if (res.ok) {
                setSuccess('Кассовая смена успешно открыта!');
                setOpenShiftOpen(false);
                loadRegistersAndShifts();
            } else {
                const errData = await res.json();
                setError(errData.error || 'Не удалось открыть смену');
            }
        } catch {
            setError('Сбой при открытии смены');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseShift = async () => {
        if (!activeShift || !actualCash) {
            setError('Введите фактическую сумму денег в кассе для сверки');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/optic/cash-shifts/${activeShift.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'close',
                    actual_cash: parseFloat(actualCash),
                }),
            });

            if (res.ok) {
                setSuccess('Кассовая смена закрыта. Произведена инкассация.');
                setCloseShiftOpen(false);
                setActualCash('');
                loadRegistersAndShifts();
            } else {
                const errData = await res.json();
                setError(errData.error || 'Ошибка при закрытии смены');
            }
        } catch {
            setError('Сбой при закрытии смены');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddTransaction = async () => {
        if (!activeShift || !txForm.amount) {
            setError('Пожалуйста, укажите сумму транзакции');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/optic/cash-shifts/${activeShift.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_transaction',
                    trans_type: txForm.trans_type,
                    amount: parseFloat(txForm.amount),
                    payment_method: txForm.payment_method,
                    category: txForm.category,
                    description: txForm.description,
                }),
            });

            if (res.ok) {
                setSuccess('Транзакция успешно проведена!');
                setTxDialogOpen(false);
                setTxForm({ trans_type: 'cash_in', amount: '', payment_method: 'cash', category: 'other', description: '' });
                loadRegistersAndShifts();
            } else {
                const errData = await res.json();
                setError(errData.error || 'Не удалось провести операцию');
            }
        } catch {
            setError('Ошибка транзакции');
        } finally {
            setIsSubmitting(false);
        }
    };

    // TRIGGER KASPI TERMINAL PAYMENT (Kaspi POS)
    const triggerKaspiPayment = async () => {
        setKaspiStatus('triggering');
        try {
            const triggerRes = await fetch('/api/optic/integration/kaspi/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(kaspiAmount),
                    order_id: kaspiOrderId,
                }),
            });

            if (!triggerRes.ok) {
                throw new Error('Trigger failed');
            }

            const triggerData = await triggerRes.json();
            const txId = triggerData.transaction_id;
            setKaspiTxId(txId);
            setKaspiStatus('pending');

            // Simulate polling POS terminal status (resolves in 4.5 seconds)
            setTimeout(async () => {
                try {
                    const statusRes = await fetch('/api/optic/integration/kaspi/check-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ transaction_id: txId }),
                    });

                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        if (statusData.status === 'PAID') {
                            setKaspiStatus('success');

                            // Commit this successful POS transaction directly into open shift ledger
                            if (activeShift) {
                                await fetch(`/api/optic/cash-shifts/${activeShift.id}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        action: 'add_transaction',
                                        trans_type: 'income',
                                        amount: parseFloat(kaspiAmount),
                                        payment_method: 'kaspi',
                                        category: 'sale',
                                        description: `Оплата заказа №${kaspiOrderId} через SmartPOS Kaspi`,
                                        kaspi_transaction_id: txId,
                                        kaspi_status: 'PAID',
                                    }),
                                });
                            }

                            setSuccess(`Платеж Kaspi на сумму ${fmt(Number(kaspiAmount))} ₸ подтвержден!`);
                            loadRegistersAndShifts();
                            setTimeout(() => setKaspiDialogOpen(false), 2000);
                        } else {
                            setKaspiStatus('failed');
                        }
                    } else {
                        setKaspiStatus('failed');
                    }
                } catch {
                    setKaspiStatus('failed');
                }
            }, 4500);
        } catch {
            setError('Не удалось связаться с Kaspi SmartPOS терминалом');
            setKaspiStatus('failed');
        }
    };

    if (session?.user && clinicPerms && !clinicPerms.canViewCash) {
        return <AccessDenied />;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <Link href="/optic/dashboard" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 mb-1">
                                <ArrowLeft className="w-3.5 h-3.5" /> Назад к дашборду
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Banknote className="w-6 h-6 text-blue-600" /> Управление кассой и POS
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">Контроль смен, приходные и расходные ордера, Kaspi SmartPOS</p>
                        </div>
                        <div className="flex gap-2.5">
                            {!activeShift ? (
                                <button onClick={() => setOpenShiftOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                                    <Unlock className="w-4 h-4" /> Открыть смену
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => setCloseShiftOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                                        <Lock className="w-4 h-4" /> Закрыть смену
                                    </button>
                                    <button onClick={() => { setKaspiStatus('idle'); setKaspiDialogOpen(true); }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-[#E31E24] hover:bg-[#B91217] text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                                        <Smartphone className="w-4 h-4" /> Kaspi POS Терминал
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Toasts */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                        </motion.div>
                    )}
                    {success && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                <span className="text-sm font-medium">{success}</span>
                            </div>
                            <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-600"><X className="w-4 h-4" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-gray-500 text-sm">Синхронизация кассовых данных...</p>
                    </div>
                ) : !activeShift ? (
                    /* Closed shift state */
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-2xl mx-auto mt-12 shadow-sm">
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-200">
                            <Lock className="w-8 h-8 text-amber-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Кассовая смена закрыта</h2>
                        <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                            Для проведения любых кассовых операций, приема платежей по заказам и работы со SmartPOS терминалом необходимо открыть новую смену и внести разменные наличные деньги.
                        </p>
                        <button onClick={() => setOpenShiftOpen(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                            <Unlock className="w-4 h-4" /> Открыть новую смену
                        </button>
                    </motion.div>
                ) : (
                    /* Open active shift state */
                    <div>
                        {/* KPI Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Стартовый баланс</div>
                                <div className="text-2xl font-bold text-gray-700 mt-2">{fmt(activeShift.starting_cash)} ₸</div>
                                <div className="text-[10px] text-gray-400 mt-1">Внесено при открытии смены</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Поступления / Продажи</div>
                                <div className="text-2xl font-bold text-emerald-600 mt-2">
                                    {fmt(activeShift.transactions?.filter(t => t.trans_type === 'income' || t.trans_type === 'cash_in').reduce((sum, t) => sum + t.amount, 0) || 0)} ₸
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">Оплаты по QR-кодам и SmartPOS</div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                <div className="text-xs font-semibold text-red-600 uppercase tracking-wide">Выплаты / Расходы</div>
                                <div className="text-2xl font-bold text-red-600 mt-2">
                                    {fmt(activeShift.transactions?.filter(t => t.trans_type === 'expense' || t.trans_type === 'cash_out').reduce((sum, t) => sum + t.amount, 0) || 0)} ₸
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1">Инкассации, поставщики, расходы</div>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm">
                                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Ожидается в кассе</div>
                                <div className="text-2xl font-bold text-blue-800 mt-2">{fmt(activeShift.expected_cash)} ₸</div>
                                <div className="text-[10px] text-blue-500 font-medium mt-1">Ожидаемая сумма наличных</div>
                            </div>
                        </div>

                        {/* Transactions Ledger Toolbar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 mt-8">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-gray-500" /> Операции за смену (Касса: {activeShift.cash_register_name})
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={() => { setTxForm({ ...txForm, trans_type: 'cash_in' }); setTxDialogOpen(true); }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition-all">
                                    <ArrowDownToLine className="w-4 h-4" /> Внесение наличных
                                </button>
                                <button onClick={() => { setTxForm({ ...txForm, trans_type: 'cash_out' }); setTxDialogOpen(true); }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-100 text-red-700 hover:bg-red-100 rounded-xl text-xs font-semibold transition-all">
                                    <ArrowUpFromLine className="w-4 h-4" /> Расход / Изъятие
                                </button>
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Тип</th>
                                            <th className="px-6 py-4">Статья ДДС</th>
                                            <th className="px-6 py-4">Метод оплаты</th>
                                            <th className="px-6 py-4">Сумма</th>
                                            <th className="px-6 py-4">Kaspi Transaction ID</th>
                                            <th className="px-6 py-4">Дата и время</th>
                                            <th className="px-6 py-4">Комментарий</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {!activeShift.transactions || activeShift.transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                                    Нет зарегистрированных денежных операций в текущей смене
                                                </td>
                                            </tr>
                                        ) : (
                                            activeShift.transactions.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                            tx.trans_type === 'income' || tx.trans_type === 'cash_in' 
                                                                ? 'bg-emerald-50 text-emerald-700' 
                                                                : 'bg-red-50 text-red-700'
                                                        }`}>
                                                            {tx.trans_type === 'income' || tx.trans_type === 'cash_in' ? 'Приход' : 'Расход'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700 uppercase text-xs">
                                                        {tx.category === 'sale' ? 'Оплата заказа' :
                                                         tx.category === 'refund' ? 'Возврат' :
                                                         tx.category === 'supplier_payment' ? 'Поставщики' :
                                                         tx.category === 'salary' ? 'Зарплата' :
                                                         tx.category === 'rent' ? 'Аренда' : 'Прочее'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                                                            tx.payment_method === 'kaspi' 
                                                                ? 'bg-red-50 text-[#E31E24] border border-red-100' 
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {tx.payment_method === 'kaspi' ? 'Kaspi POS' :
                                                             tx.payment_method === 'cash' ? 'Наличные' :
                                                             tx.payment_method === 'card' ? 'Карта' : 'Перевод'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                                                        {fmt(tx.amount)} ₸
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-400">
                                                        {tx.kaspi_transaction_id || '—'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                                                        {new Date(tx.created_at).toLocaleString('ru-RU', {
                                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                        }).replace(',', '')}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                                                        {tx.description || '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shift History Section */}
                {!loading && (
                    <div className="mt-12">
                        <div className="flex items-center gap-2 mb-6">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <h2 className="text-lg font-bold text-gray-900">История закрытых смен</h2>
                        </div>
                        {historyShifts.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
                                <p className="text-gray-500 text-sm">У вас еще нет ни одной закрытой кассовой смены.</p>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Дата</th>
                                            <th className="px-6 py-4">Касса</th>
                                            <th className="px-6 py-4">Открыл / Закрыл</th>
                                            <th className="px-6 py-4 text-right">Старт</th>
                                            <th className="px-6 py-4 text-right">Ожидалось</th>
                                            <th className="px-6 py-4 text-right">Факт (Инкасс.)</th>
                                            <th className="px-6 py-4 text-right">Разница</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {historyShifts.map((hShift) => (
                                            <tr key={hShift.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                                                    <div className="text-sm">{new Date(hShift.opened_at).toLocaleDateString('ru-RU')}</div>
                                                    <div className="text-[10px] text-gray-400">
                                                        {new Date(hShift.opened_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {hShift.closed_at ? new Date(hShift.closed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '?'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                                    {hShift.cash_register_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs text-gray-900">{hShift.opened_by_name}</div>
                                                    <div className="text-[10px] text-gray-400">Закрыл: {hShift.closed_by_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-600">
                                                    {fmt(hShift.starting_cash)} ₸
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-blue-600">
                                                    {fmt(hShift.expected_cash)} ₸
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                                                    {fmt(hShift.actual_cash)} ₸
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                                                    {hShift.discrepancy < 0 ? (
                                                        <span className="text-red-500 bg-red-50 px-2 py-1 rounded-md">{fmt(hShift.discrepancy)} ₸</span>
                                                    ) : hShift.discrepancy > 0 ? (
                                                        <span className="text-amber-500 bg-amber-50 px-2 py-1 rounded-md">+{fmt(hShift.discrepancy)} ₸</span>
                                                    ) : (
                                                        <span className="text-emerald-500">0 ₸</span>
                                                    )}
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

            {/* ==================== MODAL: OPEN SHIFT ==================== */}
            <AnimatePresence>
                {openShiftOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpenShiftOpen(false)}>
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Unlock className="w-5 h-5 text-emerald-600" /> Открытие кассовой смены
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Выберите кассу клиники и внесите разменный фонд наличных для старта рабочего дня.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Выберите кассовый ящик</label>
                                    <select value={selectedRegister} onChange={e => setSelectedRegister(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50">
                                        {registers.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Стартовый баланс (₸)</label>
                                    <input type="number" value={startingCash} onChange={e => setStartingCash(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                                    <p className="text-[10px] text-gray-400 mt-1">Обычно это сумма наличных купюр и монет для сдачи клиентам.</p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setOpenShiftOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50">
                                    Отмена
                                </button>
                                <button onClick={handleOpenShift} disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm">
                                    Открыть смену
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== MODAL: CLOSE SHIFT ==================== */}
            <AnimatePresence>
                {closeShiftOpen && activeShift && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setCloseShiftOpen(false)}>
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-red-600" /> Сверка и Закрытие смены
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Сведите баланс, пересчитав все наличные деньги в кассовом ящике физически.</p>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-xs text-amber-800 space-y-1">
                                <div className="flex justify-between">
                                    <span>Входной баланс:</span>
                                    <span className="font-bold">{fmt(activeShift.starting_cash)} ₸</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Ожидаемый баланс в кассе:</span>
                                    <span className="font-bold">{fmt(activeShift.expected_cash)} ₸</span>
                                </div>
                                <p className="text-[10px] text-amber-600 mt-2 font-medium">После закрытия смены вся фактическая сумма инкассируется.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Фактическая сумма наличных (₸)</label>
                                    <input type="number" placeholder="Введите пересчитанную сумму" value={actualCash} onChange={e => setActualCash(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setCloseShiftOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50">
                                    Отмена
                                </button>
                                <button onClick={handleCloseShift} disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm">
                                    Закрыть и инкассировать
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== MODAL: MANUAL TRANSACTION ==================== */}
            <AnimatePresence>
                {txDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setTxDialogOpen(false)}>
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {txForm.trans_type === 'cash_in' ? 'Внесение наличных' : 'Расход / Изъятие'}
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Внесите транзакцию во внутренний реестр кассовых операций ДДС.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Сумма операции (₸)</label>
                                    <input type="number" placeholder="Введите сумму" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Статья ДДС</label>
                                    <select value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-gray-50">
                                        {txForm.trans_type === 'cash_in' ? (
                                            <>
                                                <MenuItem value="sale">Оплата заказа</MenuItem>
                                                <MenuItem value="other">Внесение разменной монеты</MenuItem>
                                            </>
                                        ) : (
                                            <>
                                                <MenuItem value="supplier_payment">Оплата поставщику</MenuItem>
                                                <MenuItem value="salary">Выплата заработной платы</MenuItem>
                                                <MenuItem value="rent">Аренда помещения</MenuItem>
                                                <MenuItem value="refund">Возврат клиенту</MenuItem>
                                                <MenuItem value="other">Прочие хозяйственные расходы</MenuItem>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Назначение / Комментарий</label>
                                    <textarea placeholder="Напишите кратко причину внесения/расхода" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} rows={2}
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setTxDialogOpen(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50">
                                    Отмена
                                </button>
                                <button onClick={handleAddTransaction} disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm">
                                    Провести транзакцию
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== MODAL: KASPI POS TERMINAL ==================== */}
            <AnimatePresence>
                {kaspiDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setKaspiDialogOpen(false)}>
                        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center overflow-hidden border border-red-50">
                            
                            {/* Brand Header */}
                            <div className="flex items-center justify-center gap-2 mb-4 bg-red-50 py-3 px-4 rounded-xl border border-red-100">
                                <div className="w-6 h-6 bg-[#E31E24] rounded-lg text-white font-black text-xs flex items-center justify-center">K</div>
                                <h3 className="font-extrabold text-gray-900 tracking-tight">Kaspi SmartPOS Терминал</h3>
                            </div>

                            {kaspiStatus === 'idle' ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                                        Интеграция с SmartPOS: введите параметры для выставления счета. Сигнал об оплате автоматически передастся на POS-терминал клиники.
                                    </p>
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="block text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Сумма к оплате (₸)</label>
                                            <input type="number" placeholder="15000" value={kaspiAmount} onChange={e => setKaspiAmount(e.target.value)}
                                                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-red-500" />
                                        </div>
                                        <div>
                                            <label className="block text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ID Заказа Пациента</label>
                                            <input type="text" placeholder="1085" value={kaspiOrderId} onChange={e => setKaspiOrderId(e.target.value)}
                                                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-red-500" />
                                        </div>
                                    </div>
                                    <button onClick={triggerKaspiPayment}
                                        className="w-full py-3 bg-[#E31E24] hover:bg-[#B91217] text-white rounded-xl text-sm font-bold shadow-md transition-colors flex items-center justify-center gap-2">
                                        <Smartphone className="w-4 h-4" /> Отправить на Kaspi Терминал
                                    </button>
                                </motion.div>
                            ) : kaspiStatus === 'triggering' || kaspiStatus === 'pending' ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 px-4">
                                    <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                                        <div className="animate-spin absolute w-full h-full border-4 border-t-red-600 border-red-100 rounded-full" />
                                        <Smartphone className="w-8 h-8 text-red-500 animate-pulse" />
                                    </div>
                                    <h4 className="text-base font-bold text-gray-800 mb-1">Ожидание прикладывания карты / QR...</h4>
                                    <p className="text-xs text-gray-500 max-w-xs mx-auto mb-3">Пожалуйста, покажите клиенту QR-код на экране SmartPOS или вставьте карту в терминал.</p>
                                    <div className="bg-gray-50 border border-gray-100 py-2 px-3 rounded-lg text-[10px] text-gray-400 font-mono inline-block">
                                        ID: {kaspiTxId || 'создание...'}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium italic mt-5 leading-normal">
                                        Эмуляция: транзакция будет автоматически подтверждена через 4.5 секунды.
                                    </p>
                                </motion.div>
                            ) : kaspiStatus === 'success' ? (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 px-4">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                        <Check className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h4 className="text-lg font-bold text-emerald-700 mb-1">Оплата Успешно Проведена!</h4>
                                    <p className="text-sm text-gray-500 mb-1">Сумма к поступлению: <strong className="text-gray-900">{fmt(Number(kaspiAmount))} ₸</strong></p>
                                    <p className="text-xs text-gray-400">Чек транзакции записан в кассовый аппарат.</p>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 px-4">
                                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                                        <X className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h4 className="text-lg font-bold text-red-700 mb-1">Сбой транзакции</h4>
                                    <p className="text-xs text-gray-500 mb-5">Каспи SmartPOS терминал вернул код ошибки платежа или время ожидания истекло.</p>
                                    <button onClick={() => setKaspiStatus('idle')}
                                        className="py-2 px-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-colors">
                                        Повторить операцию
                                    </button>
                                </motion.div>
                            )}

                            <div className="border-t border-gray-100 mt-6 pt-4">
                                <button onClick={() => setKaspiDialogOpen(false)}
                                    className="text-xs font-semibold text-gray-400 hover:text-gray-600">
                                    Закрыть окно
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Simple Helper Component to support option menus
function MenuItem({ children, value }: { children: React.ReactNode; value: string }) {
    return <option value={value}>{children}</option>;
}
