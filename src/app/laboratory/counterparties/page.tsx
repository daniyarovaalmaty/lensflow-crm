'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    Building2, Stethoscope, Search, Percent, ArrowUpDown,
    ChevronRight, Filter, Users
} from 'lucide-react';
import type { SubRole } from '@/types/user';

const fmt = (n: number) => n.toLocaleString('ru-RU');

interface Doctor {
    id: string;
    name: string;
    email: string;
    clinicName: string;
    clinicId: string;
    hasOrg: boolean;
    discountPercent: number | null;
    orders: number;
    revenue: number;
    unpaid: number;
    lastDate: string;
}

interface Clinic {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    inn: string | null;
    discountPercent: number;
    status: string;
    orders: number;
    revenue: number;
    unpaid: number;
    lastDate: string;
    staffCount: number;
}

type SortField = 'name' | 'orders' | 'revenue' | 'unpaid' | 'lastDate' | 'discount';
type SortDir = 'asc' | 'desc';

export default function CounterpartiesPage() {
    const { data: session } = useSession();
    const subRole = (session?.user?.subRole || 'lab_head') as SubRole;
    const isLabHead = subRole === 'lab_head';

    const [tab, setTab] = useState<'doctors' | 'clinics'>('clinics');
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('orders');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // Discount editing
    const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
    const [discountInput, setDiscountInput] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/counterparties');
                if (res.ok) {
                    const data = await res.json();
                    setDoctors(data.doctors);
                    setClinics(data.clinics);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => (
        <ArrowUpDown className={`w-3 h-3 inline ml-1 ${sortField === field ? 'text-blue-600' : 'text-gray-300'}`} />
    );

    // Save discount for clinic (org)
    const saveClinicDiscount = async (orgId: string, value: number) => {
        try {
            const res = await fetch(`/api/organizations/${orgId}/discount`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discountPercent: value }),
            });
            if (res.ok) {
                const updated = await res.json();
                setClinics(prev => prev.map(c => c.id === orgId ? { ...c, discountPercent: updated.discountPercent } : c));
            }
        } catch (e) { console.error(e); }
        setEditingDiscount(null);
    };

    // Save discount for doctor
    const saveDoctorDiscount = async (doctorId: string, value: number) => {
        try {
            const res = await fetch(`/api/counterparties/${doctorId}/discount`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ discountPercent: value }),
            });
            if (res.ok) {
                const updated = await res.json();
                setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, discountPercent: updated.discountPercent } : d));
            }
        } catch (e) { console.error(e); }
        setEditingDiscount(null);
    };

    // Filtered + sorted doctors
    const filteredDoctors = useMemo(() => {
        let result = [...doctors];
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(d =>
                d.name.toLowerCase().includes(q) ||
                d.email.toLowerCase().includes(q) ||
                d.clinicName.toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'name': cmp = a.name.localeCompare(b.name); break;
                case 'orders': cmp = a.orders - b.orders; break;
                case 'revenue': cmp = a.revenue - b.revenue; break;
                case 'unpaid': cmp = a.unpaid - b.unpaid; break;
                case 'discount': cmp = (a.discountPercent ?? 5) - (b.discountPercent ?? 5); break;
                case 'lastDate': cmp = (a.lastDate || '').localeCompare(b.lastDate || ''); break;
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });
        return result;
    }, [doctors, search, sortField, sortDir]);

    // Filtered + sorted clinics
    const filteredClinics = useMemo(() => {
        let result = [...clinics];
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.city || '').toLowerCase().includes(q) ||
                (c.inn || '').toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'name': cmp = a.name.localeCompare(b.name); break;
                case 'orders': cmp = a.orders - b.orders; break;
                case 'revenue': cmp = a.revenue - b.revenue; break;
                case 'unpaid': cmp = a.unpaid - b.unpaid; break;
                case 'discount': cmp = a.discountPercent - b.discountPercent; break;
                case 'lastDate': cmp = (a.lastDate || '').localeCompare(b.lastDate || ''); break;
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });
        return result;
    }, [clinics, search, sortField, sortDir]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            Контрагенты
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Управление клиниками, врачами и персональными скидками</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => { setTab('clinics'); setSearch(''); }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'clinics'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Building2 className="w-4 h-4" />
                            Клиники ({clinics.length})
                        </button>
                        <button
                            onClick={() => { setTab('doctors'); setSearch(''); }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'doctors'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Stethoscope className="w-4 h-4" />
                            Врачи ({doctors.length})
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6">
                    <div className="p-4 flex items-center gap-3">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={tab === 'clinics' ? 'Поиск по названию, городу, ИИН/БИН...' : 'Поиск по имени, email, клинике...'}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="flex-1 text-sm outline-none placeholder-gray-400"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                        )}
                    </div>
                </div>

                {/* Clinics Table */}
                {tab === 'clinics' && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('name')}>
                                            Клиника <SortIcon field="name" />
                                        </th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('orders')}>
                                            Заказов <SortIcon field="orders" />
                                        </th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('revenue')}>
                                            Выручка <SortIcon field="revenue" />
                                        </th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('unpaid')}>
                                            Неоплачено <SortIcon field="unpaid" />
                                        </th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('discount')}>
                                            Скидка % <SortIcon field="discount" />
                                        </th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('lastDate')}>
                                            Посл. заказ <SortIcon field="lastDate" />
                                        </th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClinics.map(clinic => {
                                        const isEditing = editingDiscount === clinic.id;
                                        return (
                                            <tr key={clinic.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                                                            {clinic.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-gray-900">{clinic.name}</span>
                                                            {clinic.city && (
                                                                <span className="block text-xs text-gray-400">{clinic.city}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 bg-blue-50 text-blue-700 text-xs font-bold rounded-full px-2">
                                                        {clinic.orders}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right font-medium text-gray-900">{fmt(clinic.revenue)} ₸</td>
                                                <td className="py-3 px-4 text-right">
                                                    {clinic.unpaid > 0 ? (
                                                        <span className="text-red-600 font-medium">{fmt(clinic.unpaid)} ₸</span>
                                                    ) : (
                                                        <span className="text-emerald-600 font-medium">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input
                                                                type="number" min={0} max={100} step={0.5}
                                                                value={discountInput}
                                                                onChange={e => setDiscountInput(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') saveClinicDiscount(clinic.id, Number(discountInput));
                                                                    if (e.key === 'Escape') setEditingDiscount(null);
                                                                }}
                                                                className="w-16 text-center text-xs border border-blue-300 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => saveClinicDiscount(clinic.id, Number(discountInput))}
                                                                className="text-xs text-blue-600 hover:text-blue-700 font-medium">✓</button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                if (isLabHead) {
                                                                    setEditingDiscount(clinic.id);
                                                                    setDiscountInput(String(clinic.discountPercent));
                                                                }
                                                            }}
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${isLabHead
                                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                                                                : 'bg-gray-50 text-gray-600'
                                                                }`}
                                                            title={isLabHead ? 'Нажмите для редактирования' : ''}
                                                        >
                                                            <Percent className="w-3 h-3" />
                                                            {clinic.discountPercent}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right text-gray-500">
                                                    {clinic.lastDate ? new Date(clinic.lastDate).toLocaleDateString('ru-RU') : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Link
                                                        href={`/laboratory/counterparties/${clinic.id}?type=clinic`}
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        Детали <ChevronRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredClinics.length === 0 && (
                                        <tr><td colSpan={7} className="py-12 text-center text-gray-400">Нет клиник</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Doctors Table */}
                {tab === 'doctors' && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[750px]">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('name')}>
                                            Врач <SortIcon field="name" />
                                        </th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                                            Клиника
                                        </th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('orders')}>
                                            Заказов <SortIcon field="orders" />
                                        </th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('revenue')}>
                                            Выручка <SortIcon field="revenue" />
                                        </th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('unpaid')}>
                                            Неоплачено <SortIcon field="unpaid" />
                                        </th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('discount')}>
                                            Скидка % <SortIcon field="discount" />
                                        </th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                            onClick={() => toggleSort('lastDate')}>
                                            Посл. заказ <SortIcon field="lastDate" />
                                        </th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDoctors.map(doctor => {
                                        const isEditing = editingDiscount === doctor.id;
                                        const showDiscountEdit = !doctor.hasOrg; // Only for independent doctors
                                        const effectiveDiscount = doctor.hasOrg ? null : (doctor.discountPercent ?? 5);
                                        return (
                                            <tr key={doctor.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                                            {doctor.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-gray-900">{doctor.name}</span>
                                                            {doctor.email && (
                                                                <span className="block text-xs text-gray-400">{doctor.email}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {doctor.clinicName ? (
                                                        <Link
                                                            href={`/laboratory/counterparties/${doctor.clinicId}?type=clinic`}
                                                            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                                        >
                                                            {doctor.clinicName}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Независимый</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 bg-blue-50 text-blue-700 text-xs font-bold rounded-full px-2">
                                                        {doctor.orders}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right font-medium text-gray-900">{fmt(doctor.revenue)} ₸</td>
                                                <td className="py-3 px-4 text-right">
                                                    {doctor.unpaid > 0 ? (
                                                        <span className="text-red-600 font-medium">{fmt(doctor.unpaid)} ₸</span>
                                                    ) : (
                                                        <span className="text-emerald-600 font-medium">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {showDiscountEdit ? (
                                                        isEditing ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <input
                                                                    type="number" min={0} max={100} step={0.5}
                                                                    value={discountInput}
                                                                    onChange={e => setDiscountInput(e.target.value)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter') saveDoctorDiscount(doctor.id, Number(discountInput));
                                                                        if (e.key === 'Escape') setEditingDiscount(null);
                                                                    }}
                                                                    className="w-16 text-center text-xs border border-blue-300 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => saveDoctorDiscount(doctor.id, Number(discountInput))}
                                                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium">✓</button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    if (isLabHead) {
                                                                        setEditingDiscount(doctor.id);
                                                                        setDiscountInput(String(effectiveDiscount));
                                                                    }
                                                                }}
                                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${isLabHead
                                                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                                                                    : 'bg-gray-50 text-gray-600'
                                                                    }`}
                                                                title={isLabHead ? 'Нажмите для редактирования' : ''}
                                                            >
                                                                <Percent className="w-3 h-3" />
                                                                {effectiveDiscount}
                                                            </button>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-gray-400" title="Скидка берётся из клиники">от клиники</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right text-gray-500">
                                                    {doctor.lastDate ? new Date(doctor.lastDate).toLocaleDateString('ru-RU') : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <Link
                                                        href={`/laboratory/counterparties/${doctor.id}?type=doctor`}
                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        Детали <ChevronRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredDoctors.length === 0 && (
                                        <tr><td colSpan={8} className="py-12 text-center text-gray-400">Нет врачей</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Summary stats */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 font-medium">Всего клиник</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{clinics.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 font-medium">Всего врачей</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{doctors.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 font-medium">Общая выручка</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{fmt(clinics.reduce((s, c) => s + c.revenue, 0))} ₸</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 font-medium">Неоплачено</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{fmt(clinics.reduce((s, c) => s + c.unpaid, 0))} ₸</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
