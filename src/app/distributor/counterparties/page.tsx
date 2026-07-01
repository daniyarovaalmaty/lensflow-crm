'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Building2, Phone, Mail, MapPin, TrendingUp,
    ShoppingCart, AlertCircle, X, ChevronRight, BadgeCheck,
    Users, Package, ArrowUpDown, Hash, Plus, Save, Percent
} from 'lucide-react';
import type { SubRole } from '@/types/user';
import Link from 'next/link';

interface Counterparty {
    id: string;
    organizationId: string | null;
    name: string;
    type: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    inn: string | null;
    address: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
    discountPercent: number;
    status: string;
    memberSince: string;
    totalOrders: number;
    totalRevenue: number;
    unpaidAmount: number;
    lastOrderAt: string | null;
}

type SortField = 'name' | 'totalOrders' | 'totalRevenue' | 'unpaidAmount' | 'lastOrderAt';

function formatPrice(v: number) {
    return v.toLocaleString('ru-RU') + ' ₸';
}

function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(d: string | null) {
    if (!d) return '—';
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 30) return `${days} дн. назад`;
    if (days < 365) return `${Math.floor(days / 30)} мес. назад`;
    return `${Math.floor(days / 365)} г. назад`;
}

export default function CounterpartiesPage() {
    const { data: session } = useSession();
    const subRole = (session?.user as any)?.subRole as SubRole;

    const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortField>('totalOrders');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [selected, setSelected] = useState<Counterparty | null>(null);
    const [filterUnpaid, setFilterUnpaid] = useState(false);

    // Add modal
    const [showAdd, setShowAdd] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        name: '', phone: '', email: '', city: '',
        inn: '', address: '', contactPerson: '',
        contactPhone: '', discountPercent: '0',
    });

    const resetForm = () => setForm({
        name: '', phone: '', email: '', city: '',
        inn: '', address: '', contactPerson: '',
        contactPhone: '', discountPercent: '0',
    });

    const handleAdd = async () => {
        if (!form.name.trim()) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/distributor/counterparties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                const newOrg = await res.json();
                const newCp: Counterparty = {
                    id: newOrg.id,
                    organizationId: newOrg.id,
                    name: newOrg.name,
                    type: newOrg.type,
                    phone: newOrg.phone,
                    email: newOrg.email,
                    city: newOrg.city,
                    inn: newOrg.inn,
                    address: newOrg.address,
                    contactPerson: newOrg.contactPerson,
                    contactPhone: newOrg.contactPhone,
                    discountPercent: newOrg.discountPercent,
                    status: newOrg.status,
                    memberSince: newOrg.createdAt,
                    totalOrders: 0,
                    totalRevenue: 0,
                    unpaidAmount: 0,
                    lastOrderAt: null,
                };
                setCounterparties(prev => [newCp, ...prev]);
                setShowAdd(false);
                resetForm();
            }
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    useEffect(() => {
        fetch('/api/distributor/counterparties')
            .then(r => r.ok ? r.json() : [])
            .then(data => { setCounterparties(data); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let list = [...counterparties];
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(c =>
                c.name.toLowerCase().includes(s) ||
                (c.city || '').toLowerCase().includes(s) ||
                (c.inn || '').includes(s) ||
                (c.phone || '').includes(s)
            );
        }
        if (filterUnpaid) list = list.filter(c => c.unpaidAmount > 0);

        list.sort((a, b) => {
            let aVal: any = a[sortBy];
            let bVal: any = b[sortBy];
            if (sortBy === 'lastOrderAt') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            }
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return list;
    }, [counterparties, search, sortBy, sortDir, filterUnpaid]);

    const totalRevenue = counterparties.reduce((s, c) => s + c.totalRevenue, 0);
    const totalUnpaid = counterparties.reduce((s, c) => s + c.unpaidAmount, 0);
    const totalOrders = counterparties.reduce((s, c) => s + c.totalOrders, 0);

    const toggleSort = (field: SortField) => {
        if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(field); setSortDir('desc'); }
    };

    const SortIcon = ({ field }: { field: SortField }) => (
        <ArrowUpDown className={`w-3.5 h-3.5 ml-1 inline ${sortBy === field ? 'text-blue-600' : 'text-gray-300'}`} />
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Загрузка контрагентов...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <div className="bg-surface-elevated border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Контрагенты</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Ваши оптики и клиники-партнёры</p>
                        </div>
                        <button
                            onClick={() => { resetForm(); setShowAdd(true); }}
                            className="btn btn-primary gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Добавить
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                        {[
                            { label: 'Всего контрагентов', value: counterparties.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Всего заказов', value: totalOrders, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Общий оборот', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Дебиторка', value: formatPrice(totalUnpaid), icon: AlertCircle, color: totalUnpaid > 0 ? 'text-red-600' : 'text-gray-400', bg: totalUnpaid > 0 ? 'bg-red-50' : 'bg-gray-50' },
                        ].map(s => (
                            <div key={s.label} className={`rounded-xl p-3.5 ${s.bg}`}>
                                <div className={`flex items-center gap-2 mb-1 ${s.color}`}>
                                    <s.icon className="w-4 h-4" />
                                    <span className="text-xs font-medium opacity-80">{s.label}</span>
                                </div>
                                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Search + Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Поиск по названию, городу, ИНН..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="input pl-10 w-full"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setFilterUnpaid(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                            filterUnpaid
                                ? 'bg-red-50 border-red-300 text-red-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <AlertCircle className="w-4 h-4" />
                        Только с долгами
                    </button>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">
                            {counterparties.length === 0 ? 'Нет контрагентов' : 'Ничего не найдено'}
                        </p>
                        {counterparties.length === 0 && (
                            <p className="text-gray-400 text-sm mt-1">Контрагенты появятся когда оптики начнут размещать заказы</p>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Table */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Table header */}
                            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                <button onClick={() => toggleSort('name')} className="flex items-center text-left hover:text-gray-700">
                                    Контрагент <SortIcon field="name" />
                                </button>
                                <button onClick={() => toggleSort('totalOrders')} className="flex items-center hover:text-gray-700">
                                    Заказы <SortIcon field="totalOrders" />
                                </button>
                                <button onClick={() => toggleSort('totalRevenue')} className="flex items-center hover:text-gray-700">
                                    Оборот <SortIcon field="totalRevenue" />
                                </button>
                                <button onClick={() => toggleSort('unpaidAmount')} className="flex items-center hover:text-gray-700">
                                    Долг <SortIcon field="unpaidAmount" />
                                </button>
                                <button onClick={() => toggleSort('lastOrderAt')} className="flex items-center hover:text-gray-700">
                                    Активность <SortIcon field="lastOrderAt" />
                                </button>
                                <div />
                            </div>

                            {/* Rows */}
                            <div className="divide-y divide-gray-100">
                                {filtered.map((cp, idx) => (
                                    <motion.div
                                        key={cp.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        onClick={() => setSelected(cp)}
                                        className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        {/* Name + city + inn */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm">
                                                {cp.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-gray-900 truncate">{cp.name}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {cp.city && (
                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />{cp.city}
                                                        </span>
                                                    )}
                                                    {cp.inn && (
                                                        <span className="text-xs text-gray-400">БИН: {cp.inn}</span>
                                                    )}
                                                    {cp.discountPercent > 0 && (
                                                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                                            -{cp.discountPercent}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Orders */}
                                        <div className="flex items-center sm:block">
                                            <span className="text-xs text-gray-500 sm:hidden mr-2">Заказов:</span>
                                            <span className="text-sm font-semibold text-gray-900">{cp.totalOrders}</span>
                                        </div>

                                        {/* Revenue */}
                                        <div className="flex items-center sm:block">
                                            <span className="text-xs text-gray-500 sm:hidden mr-2">Оборот:</span>
                                            <span className="text-sm font-semibold text-emerald-700">{formatPrice(cp.totalRevenue)}</span>
                                        </div>

                                        {/* Unpaid */}
                                        <div className="flex items-center sm:block">
                                            <span className="text-xs text-gray-500 sm:hidden mr-2">Долг:</span>
                                            {cp.unpaidAmount > 0 ? (
                                                <span className="text-sm font-semibold text-red-600">{formatPrice(cp.unpaidAmount)}</span>
                                            ) : (
                                                <span className="text-sm text-gray-400">—</span>
                                            )}
                                        </div>

                                        {/* Last activity */}
                                        <div className="flex items-center sm:block">
                                            <span className="text-xs text-gray-500 sm:hidden mr-2">Заказ:</span>
                                            <span className="text-xs text-gray-500">{timeAgo(cp.lastOrderAt)}</span>
                                        </div>

                                        <div className="hidden sm:flex items-center justify-center">
                                            <ChevronRight className="w-4 h-4 text-gray-300" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 text-center mt-4">
                            Показано {filtered.length} из {counterparties.length} контрагентов
                        </p>
                    </>
                )}
            </div>

            {/* Add Modal */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowAdd(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Новый контрагент</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">Оптика или клиника-партнёр</p>
                                </div>
                                <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Название <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder='ООО "Оптика Народная"'
                                        className="input w-full"
                                        autoFocus
                                    />
                                </div>

                                {/* Phone + Email */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Телефон</span>
                                        </label>
                                        <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+7 777 000 00 00" className="input w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</span>
                                        </label>
                                        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@optica.kz" className="input w-full" />
                                    </div>
                                </div>

                                {/* City + INN */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Город</span>
                                        </label>
                                        <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Алматы" className="input w-full" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> БИН/ИИН</span>
                                        </label>
                                        <input type="text" value={form.inn} onChange={e => setForm(f => ({ ...f, inn: e.target.value }))} placeholder="123456789012" className="input w-full font-mono" />
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Адрес</span>
                                    </label>
                                    <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="ул. Абая 1, офис 12" className="input w-full" />
                                </div>

                                {/* Contact person + phone */}
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Контактное лицо</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">ФИО</label>
                                            <input type="text" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Иванова Анна" className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
                                            <input type="tel" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+7 777 111 22 33" className="input w-full" />
                                        </div>
                                    </div>
                                </div>

                                {/* Discount */}
                                <div className="border-t border-gray-100 pt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> Персональная скидка (%)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={form.discountPercent}
                                        onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))}
                                        placeholder="0"
                                        className="input w-32"
                                        min="0"
                                        max="100"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Будет автоматически применяться к заказам этого клиента</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50 sticky bottom-0">
                                <button onClick={() => setShowAdd(false)} className="btn btn-secondary">Отмена</button>
                                <button
                                    onClick={handleAdd}
                                    disabled={isSaving || !form.name.trim()}
                                    className="btn btn-primary gap-2"
                                >
                                    {isSaving ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Сохранение...</>
                                    ) : (
                                        <><Save className="w-4 h-4" /> Добавить контрагента</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail Panel */}
            <AnimatePresence>
                {selected && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                            onClick={() => setSelected(null)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
                        >
                            {/* Panel Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                        {selected.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm leading-tight">{selected.name}</div>
                                        <div className={`text-xs font-medium mt-0.5 ${selected.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                                            {selected.status === 'active' ? '● Активный' : '● Заблокирован'}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 space-y-6">
                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50 rounded-xl p-3.5">
                                        <div className="text-xs text-blue-600 font-medium mb-1">Заказов</div>
                                        <div className="text-2xl font-bold text-blue-700">{selected.totalOrders}</div>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-3.5">
                                        <div className="text-xs text-emerald-600 font-medium mb-1">Оборот</div>
                                        <div className="text-lg font-bold text-emerald-700 leading-tight">{formatPrice(selected.totalRevenue)}</div>
                                    </div>
                                    {selected.unpaidAmount > 0 && (
                                        <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                            <div>
                                                <div className="text-xs text-red-600 font-medium">Задолженность</div>
                                                <div className="text-lg font-bold text-red-700">{formatPrice(selected.unpaidAmount)}</div>
                                            </div>
                                        </div>
                                    )}
                                    {selected.discountPercent > 0 && (
                                        <div className="col-span-2 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                                            <BadgeCheck className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-medium text-green-700">Персональная скидка: <strong>{selected.discountPercent}%</strong></span>
                                        </div>
                                    )}
                                </div>

                                {/* Contact info */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Контактная информация</h3>
                                    <div className="space-y-2.5">
                                        {selected.phone && (
                                            <a href={`tel:${selected.phone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 group">
                                                <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Phone className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                                </div>
                                                {selected.phone}
                                            </a>
                                        )}
                                        {selected.email && (
                                            <a href={`mailto:${selected.email}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 group">
                                                <div className="w-8 h-8 bg-gray-100 group-hover:bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Mail className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                                </div>
                                                {selected.email}
                                            </a>
                                        )}
                                        {selected.address && (
                                            <div className="flex items-start gap-3 text-sm text-gray-700">
                                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <MapPin className="w-4 h-4 text-gray-400" />
                                                </div>
                                                {selected.address}
                                            </div>
                                        )}
                                        {selected.inn && (
                                            <div className="flex items-center gap-3 text-sm text-gray-700">
                                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Hash className="w-4 h-4 text-gray-400" />
                                                </div>
                                                БИН/ИИН: <span className="font-mono">{selected.inn}</span>
                                            </div>
                                        )}
                                        {!selected.phone && !selected.email && !selected.address && !selected.inn && (
                                            <p className="text-sm text-gray-400 italic">Контактная информация не заполнена</p>
                                        )}
                                    </div>
                                </div>

                                {/* Contact person */}
                                {(selected.contactPerson || selected.contactPhone) && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Контактное лицо</h3>
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            {selected.contactPerson && (
                                                <div className="font-medium text-gray-900 text-sm">{selected.contactPerson}</div>
                                            )}
                                            {selected.contactPhone && (
                                                <a href={`tel:${selected.contactPhone}`} className="text-sm text-blue-600 hover:underline mt-1 block">
                                                    {selected.contactPhone}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Dates */}
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">История</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Партнёр с</span>
                                            <span className="font-medium text-gray-900">{formatDate(selected.memberSince)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Последний заказ</span>
                                            <span className="font-medium text-gray-900">{formatDate(selected.lastOrderAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="space-y-2 pt-2">
                                    <Link
                                        href={`/distributor?clinic=${selected.organizationId || selected.name}`}
                                        className="flex items-center justify-between w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-colors"
                                        onClick={() => setSelected(null)}
                                    >
                                        <span className="flex items-center gap-2">
                                            <ShoppingCart className="w-4 h-4" />
                                            Посмотреть заказы
                                        </span>
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
