'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, TrendingUp, TrendingDown, Plus, CreditCard, 
    Landmark, DollarSign, ArrowUpRight, ArrowDownRight, Briefcase
} from 'lucide-react';
import Link from 'next/link';

interface Account {
    id: string;
    name: string;
    balance: number;
}

interface Tx {
    id: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    date: string;
    account: { name: string };
    createdBy: { fullName: string; email: string };
}

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function FinancesDashboard() {
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Tx[]>([]);
    const [analytics, setAnalytics] = useState({ totalIncome: 0, totalExpense: 0, netProfit: 0 });

    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [txModalOpen, setTxModalOpen] = useState(false);
    const [txType, setTxType] = useState<'income' | 'expense'>('expense');

    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountBalance, setNewAccountBalance] = useState('');

    const [txForm, setTxForm] = useState({
        accountId: '',
        category: 'rent',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [accRes, txRes, anRes] = await Promise.all([
                fetch('/api/optic/finances/accounts'),
                fetch('/api/optic/finances/transactions'),
                fetch('/api/optic/finances/analytics')
            ]);
            if (accRes.ok) {
                const accData = await accRes.json();
                setAccounts(accData);
                if (accData.length > 0 && !txForm.accountId) {
                    setTxForm(prev => ({ ...prev, accountId: accData[0].id }));
                }
            }
            if (txRes.ok) setTransactions(await txRes.json());
            if (anRes.ok) {
                const anData = await anRes.json();
                setAnalytics(anData.summary);
            }
        } catch (e) {
            console.error('Failed to fetch finances', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateAccount = async () => {
        if (!newAccountName) return;
        const res = await fetch('/api/optic/finances/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newAccountName, initialBalance: newAccountBalance })
        });
        if (res.ok) {
            setAccountModalOpen(false);
            setNewAccountName('');
            setNewAccountBalance('');
            fetchData();
        }
    };

    const handleAddTx = async () => {
        if (!txForm.accountId || !txForm.amount) return;
        const res = await fetch('/api/optic/finances/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...txForm,
                type: txType
            })
        });
        if (res.ok) {
            setTxModalOpen(false);
            setTxForm(prev => ({ ...prev, amount: '', description: '' }));
            fetchData();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Wallet className="w-6 h-6 text-blue-600" /> Финансы и P&L
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">Глобальный учет компании: счета, расходы, чистая прибыль</p>
                        </div>
                        <div className="flex gap-2">
                            <Link href="/optic/finances/payroll"
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-semibold transition-all">
                                <Briefcase className="w-4 h-4" /> Зарплаты (Калькулятор)
                            </Link>
                            <button onClick={() => setAccountModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-all shadow-sm">
                                <Landmark className="w-4 h-4" /> Новый счет
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
                {/* P&L Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Доходы (Кассы + Безнал)</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(analytics.totalIncome)} ₸</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Расходы (Аренда, ЗП, Закупки)</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{fmt(analytics.totalExpense)} ₸</p>
                        </div>
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                            <TrendingDown className="w-6 h-6 text-red-500" />
                        </div>
                    </div>
                    <div className="bg-blue-600 rounded-2xl p-6 border border-blue-700 shadow-md flex items-center justify-between text-white">
                        <div>
                            <p className="text-sm font-medium text-blue-100">Чистая прибыль (Net Profit)</p>
                            <p className="text-3xl font-extrabold mt-1">{fmt(analytics.netProfit)} ₸</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Accounts list */}
                    <div className="lg:col-span-1 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-gray-500" /> Счета компании
                        </h2>
                        {loading ? (
                            <div className="animate-pulse flex flex-col gap-3">
                                {[1,2].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>)}
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-500">
                                Нет добавленных счетов.
                            </div>
                        ) : accounts.map(acc => (
                            <div key={acc.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-colors">
                                <h3 className="font-bold text-gray-800">{acc.name}</h3>
                                <p className="text-2xl font-bold text-gray-900 mt-2">{fmt(acc.balance)} ₸</p>
                            </div>
                        ))}
                        <button onClick={() => { setTxType('expense'); setTxModalOpen(true); }}
                            className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl font-semibold transition-all">
                            <ArrowDownRight className="w-4 h-4" /> Добавить Расход
                        </button>
                        <button onClick={() => { setTxType('income'); setTxModalOpen(true); }}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-semibold transition-all">
                            <ArrowUpRight className="w-4 h-4" /> Добавить Доход
                        </button>
                    </div>

                    {/* Transactions list */}
                    <div className="lg:col-span-2">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-gray-500" /> Операции по счетам
                        </h2>
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                    <tr>
                                        <th className="px-6 py-3">Дата</th>
                                        <th className="px-6 py-3">Счет</th>
                                        <th className="px-6 py-3">Категория</th>
                                        <th className="px-6 py-3 text-right">Сумма</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-500">{new Date(tx.date).toLocaleDateString('ru-RU')}</td>
                                            <td className="px-6 py-4 font-medium text-gray-700">{tx.account.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 uppercase text-xs tracking-wider">
                                                    {tx.category === 'rent' ? 'Аренда' : 
                                                     tx.category === 'salary' ? 'Зарплата' : 
                                                     tx.category === 'marketing' ? 'Маркетинг' : 
                                                     tx.category === 'supplier_payment' ? 'Поставщики' : 'Прочее'}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">{tx.description}</div>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)} ₸
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-gray-400">Нет операций</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Modal */}
            <AnimatePresence>
                {accountModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setAccountModalOpen(false)}>
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Создать счет</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Название счета</label>
                                    <input type="text" placeholder="Halyk Bank" value={newAccountName} onChange={e => setNewAccountName(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Начальный баланс (₸)</label>
                                    <input type="number" placeholder="0" value={newAccountBalance} onChange={e => setNewAccountBalance(e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <button onClick={handleCreateAccount} className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold mt-2 hover:bg-blue-700">
                                    Сохранить
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Transaction Modal */}
            <AnimatePresence>
                {txModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setTxModalOpen(false)}>
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                {txType === 'income' ? 'Добавить доход' : 'Добавить расход'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Счет списания/пополнения</label>
                                    <select value={txForm.accountId} onChange={e => setTxForm({...txForm, accountId: e.target.value})}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)} ₸)</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Категория</label>
                                    <select value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                                        {txType === 'expense' ? (
                                            <>
                                                <option value="rent">Аренда</option>
                                                <option value="salary">Зарплата</option>
                                                <option value="marketing">Маркетинг</option>
                                                <option value="supplier_payment">Поставщикам</option>
                                                <option value="other">Прочее</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="sales">Продажи B2B</option>
                                                <option value="investment">Инвестиции</option>
                                                <option value="other">Прочее</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Сумма (₸)</label>
                                    <input type="number" placeholder="50000" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Описание (необязательно)</label>
                                    <input type="text" placeholder="За май" value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <button onClick={handleAddTx} className={`w-full py-2.5 text-white rounded-xl text-sm font-bold mt-2 ${txType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    Провести операцию
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
