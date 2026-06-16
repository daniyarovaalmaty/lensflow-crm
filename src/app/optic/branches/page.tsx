'use client';

import { useState, useEffect, useCallback } from 'react';
import QuickNav from '@/components/ui/QuickNav';
import { Building2, Plus, MapPin, Phone, Users, ShoppingCart, Trash2, Edit, X, Check, UserPlus, UserMinus, Loader2, MessageCircle } from 'lucide-react';

interface Branch {
    id: string;
    name: string;
    address: string | null;
    deliveryAddress: string | null;
    city: string | null;
    phone: string | null;
    crmPhone: string | null;
    bankName: string | null;
    bik: string | null;
    iban: string | null;
    createdAt: string;
    usersCount: number;
    ordersCount: number;
    patientsCount: number;
    employees: { id: string; fullName: string; subRole: string }[];
}

interface Employee {
    id: string;
    fullName: string;
    subRole: string;
}

const subRoleLabels: Record<string, string> = {
    optic_manager: 'Руководитель',
    optic_doctor: 'Врач',
    optic_accountant: 'Бухгалтер',
    sales_manager: 'Менеджер продаж',
};

export default function BranchesPage() {
    const [orgType, setOrgType] = useState('standalone');
    const [orgName, setOrgName] = useState('');
    const [orgCrmPhone, setOrgCrmPhone] = useState('');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', address: '', deliveryAddress: '', city: '', phone: '', crmPhone: '', bankName: '', bik: '', iban: '' });
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [assigningBranch, setAssigningBranch] = useState<string | null>(null);
    const [editingOrgCrm, setEditingOrgCrm] = useState(false);
    const [orgCrmInput, setOrgCrmInput] = useState('');

    const loadData = useCallback(async () => {
        try {
            const res = await fetch('/api/branches');
            if (res.ok) {
                const data = await res.json();
                setOrgType(data.orgType);
                setOrgName(data.orgName);
                setOrgCrmPhone(data.orgCrmPhone || '');
                setBranches(data.branches);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const loadEmployees = async () => {
        const res = await fetch('/api/clinic-staff');
        if (res.ok) {
            const data = await res.json();
            setAllEmployees(data.filter((e: any) => e.subRole !== 'optic_manager'));
        }
    };

    useEffect(() => { loadData(); loadEmployees(); }, [loadData]);

    const handleSubmit = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch('/api/branches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: editingId ? 'update' : 'create',
                    branchId: editingId,
                    ...form,
                }),
            });
            if (res.ok) {
                setShowForm(false);
                setEditingId(null);
                setForm({ name: '', address: '', deliveryAddress: '', city: '', phone: '', crmPhone: '', bankName: '', bik: '', iban: '' });
                await loadData();
            } else {
                const data = await res.json();
                alert(data.error || 'Ошибка');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (branchId: string) => {
        if (!confirm('Удалить филиал? Он будет деактивирован.')) return;
        const res = await fetch('/api/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', branchId }),
        });
        if (res.ok) {
            await loadData();
        } else {
            const data = await res.json();
            alert(data.error || 'Ошибка удаления');
        }
    };

    const handleAssign = async (branchId: string, userId: string) => {
        await fetch('/api/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'assign_employee', branchId, userId }),
        });
        await loadData();
    };

    const handleUnassign = async (branchId: string, userId: string) => {
        await fetch('/api/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'unassign_employee', branchId, userId }),
        });
        await loadData();
    };

    const handleSaveOrgCrm = async () => {
        await fetch('/api/branches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_org_crm', crmPhone: orgCrmInput }),
        });
        setOrgCrmPhone(orgCrmInput);
        setEditingOrgCrm(false);
    };

    const startEdit = (branch: Branch) => {
        setEditingId(branch.id);
        setForm({
            name: branch.name,
            address: branch.address || '',
            deliveryAddress: branch.deliveryAddress || '',
            city: branch.city || '',
            phone: branch.phone || '',
            crmPhone: branch.crmPhone || '',
            bankName: branch.bankName || '',
            bik: branch.bik || '',
            iban: branch.iban || '',
        });
        setShowForm(true);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                            Филиалы
                            {branches.length > 0 && <span className="text-base font-normal text-gray-400">({branches.length})</span>}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {orgName} • {orgType === 'headquarters' ? 'Головная компания' : 'Добавьте филиалы для мультиточечного управления'}
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', address: '', deliveryAddress: '', city: '', phone: '', crmPhone: '', bankName: '', bik: '', iban: '' }); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Добавить филиал
                    </button>
                </div>

                {/* Create/Edit Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingId ? 'Редактировать филиал' : 'Новый филиал'}
                                </h2>
                                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Название *</label>
                                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Оптика Алматы-1" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Юр. Адрес</label>
                                        <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="ул. Абая 150, Алматы" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Фактический адрес доставки</label>
                                        <input value={form.deliveryAddress} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} placeholder="ул. Абая 150, Блок Б" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Город</label>
                                        <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Алматы" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Телефон</label>
                                        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+7 777 123 45 67" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 pt-4 mt-2">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Банковские реквизиты</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Название банка</label>
                                            <input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="АО Kaspi Bank" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">БИК</label>
                                            <input value={form.bik} onChange={e => setForm(f => ({ ...f, bik: e.target.value }))} placeholder="KSPIKZKX" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">IBAN</label>
                                            <input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="KZ123456789012345678" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-gray-600 hover:text-gray-800 text-sm font-medium">Отмена</button>
                                <button onClick={handleSubmit} disabled={!form.name.trim() || saving} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editingId ? 'Сохранить' : 'Создать'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                ) : branches.length === 0 ? (
                    <div className="text-center py-20">
                        <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Нет филиалов</h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                            Создайте первый филиал, чтобы управлять несколькими точками продаж. У каждого филиала будет свой склад, касса и сотрудники.
                        </p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors mx-auto"
                        >
                            <Plus className="w-4 h-4" /> Создать первый филиал
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {branches.map(branch => (
                            <div key={branch.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900">{branch.name}</h3>
                                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                                                {branch.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {branch.address}</span>}
                                                {branch.city && <span className="flex items-center gap-1">{branch.city}</span>}
                                                {branch.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {branch.phone}</span>}
                                                {branch.crmPhone && (
                                                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                        <MessageCircle className="w-3 h-3" /> CRM: {branch.crmPhone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(branch)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(branch.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-4 mt-3">
                                        {[
                                            { label: 'Сотрудников', value: branch.employees.length, icon: Users, color: 'text-blue-600' },
                                            { label: 'Заказов', value: branch.ordersCount, icon: ShoppingCart, color: 'text-violet-600' },
                                            { label: 'Пациентов', value: branch.patientsCount, icon: Users, color: 'text-emerald-600' },
                                        ].map((s, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm">
                                                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                                                <span className="font-semibold text-gray-900">{s.value}</span>
                                                <span className="text-gray-400 text-xs">{s.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Employees */}
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Сотрудники</span>
                                            <button
                                                onClick={() => setAssigningBranch(assigningBranch === branch.id ? null : branch.id)}
                                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                            >
                                                <UserPlus className="w-3 h-3" /> Назначить
                                            </button>
                                        </div>

                                        {branch.employees.length === 0 ? (
                                            <p className="text-xs text-gray-400">Нет назначенных сотрудников</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {branch.employees.map(emp => (
                                                    <div key={emp.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                                                        <span className="font-medium text-gray-800">{emp.fullName || 'Без имени'}</span>
                                                        <span className="text-xs text-gray-400">{subRoleLabels[emp.subRole] || emp.subRole}</span>
                                                        <button onClick={() => handleUnassign(branch.id, emp.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-1">
                                                            <UserMinus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Employee assignment dropdown */}
                                        {assigningBranch === branch.id && (
                                            <div className="mt-3 p-3 bg-indigo-50 rounded-xl">
                                                <p className="text-xs text-indigo-700 font-medium mb-2">Выберите сотрудника для назначения:</p>
                                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                                    {allEmployees
                                                        .filter(e => !branch.employees.some(be => be.id === e.id))
                                                        .map(emp => (
                                                            <button key={emp.id} onClick={() => { handleAssign(branch.id, emp.id); setAssigningBranch(null); }} className="w-full text-left px-3 py-2 bg-white rounded-lg text-sm hover:bg-indigo-100 transition-colors flex items-center justify-between">
                                                                <span className="font-medium text-gray-800">{emp.fullName}</span>
                                                                <span className="text-xs text-gray-400">{subRoleLabels[emp.subRole] || emp.subRole}</span>
                                                            </button>
                                                        ))}
                                                    {allEmployees.filter(e => !branch.employees.some(be => be.id === e.id)).length === 0 && (
                                                        <p className="text-xs text-indigo-500">Все сотрудники уже назначены</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
