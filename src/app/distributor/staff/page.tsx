'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Mail, Phone, X, User, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getEffectiveDistributorPermissions } from '@/types/user';

const DIST_SUBROLES = [
    { value: 'dist_admin', label: 'Администратор' },
    { value: 'dist_manager', label: 'Менеджер' },
    { value: 'dist_accountant', label: 'Бухгалтер' },
];

const SUBROLE_LABELS: Record<string, string> = {
    dist_head: 'Руководитель',
    dist_admin: 'Администратор',
    dist_manager: 'Менеджер',
    dist_accountant: 'Бухгалтер',
};

const PERM_LABELS = [
    { key: 'canViewCounterparties', label: 'Доступ к Контрагентам' },
    { key: 'canViewCatalog', label: 'Доступ к Товарам' },
    { key: 'canViewWholesale', label: 'Доступ к Продажам' },
    { key: 'canViewWarehouse', label: 'Доступ к Складу' },
    { key: 'canViewStaff', label: 'Доступ к Сотрудникам' },
    { key: 'canViewSettings', label: 'Доступ к Настройкам' },
];

export default function DistributorStaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Create
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', subRole: 'dist_manager', password: '',
    });

    // Edit
    const [editModal, setEditModal] = useState<any>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [editForm, setEditForm] = useState({ fullName: '', phone: '', subRole: '', password: '' });
    const [editPermissions, setEditPermissions] = useState<any>({});

    const loadStaff = async () => {
        const res = await fetch('/api/staff');
        if (res.ok) setStaff(await res.json());
        setLoading(false);
    };

    useEffect(() => { loadStaff(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/staff/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, role: 'distributor' }),
            });
            if (res.ok) {
                toast.success('Сотрудник создан');
                setShowModal(false);
                setForm({ fullName: '', email: '', phone: '', subRole: 'dist_manager', password: '' });
                loadStaff();
            } else {
                const data = await res.json();
                setError(data.error || 'Ошибка создания');
            }
        } catch (error) {
            setError('Ошибка сети');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal) return;
        setEditSaving(true);
        setEditError('');
        try {
            const payload: any = { 
                fullName: editForm.fullName,
                phone: editForm.phone,
                subRole: editForm.subRole,
                permissions: editPermissions 
            };
            if (editForm.password) {
                payload.password = editForm.password;
            }

            const res = await fetch(`/api/staff/${editModal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success('Данные обновлены');
                setEditModal(null);
                loadStaff();
            } else {
                const data = await res.json();
                setEditError(data.error || 'Ошибка обновления');
            }
        } catch (error) {
            setEditError('Ошибка сети');
        } finally {
            setEditSaving(false);
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Сотрудники</h1>
                    <p className="text-gray-500 mt-1">Управление доступом сотрудников</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Добавить
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-400">Загрузка...</div>
                ) : staff.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>Нет сотрудников</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {staff.map(s => (
                            <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900">{s.fullName}</div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="flex items-center gap-1 text-sm text-gray-500"><Mail className="w-3.5 h-3.5" />{s.email}</span>
                                        {s.phone && <span className="flex items-center gap-1 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" />{s.phone}</span>}
                                    </div>
                                </div>
                                <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                                    {SUBROLE_LABELS[s.subRole] || s.subRole}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {s.status === 'active' ? 'Активен' : s.status}
                                </span>
                                {(true) && (
                                    <button 
                                        onClick={() => {
                                            setEditModal(s);
                                            setEditForm({ fullName: s.fullName, phone: s.phone || '', subRole: s.subRole, password: '' });
                                            setEditPermissions(getEffectiveDistributorPermissions(s));
                                            setEditError('');
                                        }}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">Новый сотрудник</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-4">
                            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                                <input required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Роль *</label>
                                <select value={form.subRole} onChange={e => setForm(f => ({ ...f, subRole: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                                    {DIST_SUBROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
                                <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                                    Отмена
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {saving ? 'Создание...' : 'Создать'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div>
                                <h3 className="font-bold text-gray-900">Редактирование: {editModal.fullName}</h3>
                                <p className="text-sm text-gray-500">{editModal.email}</p>
                            </div>
                            <button onClick={() => setEditModal(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-5 overflow-y-auto space-y-6">
                            {editError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{editError}</div>}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                                    <input required value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                                    <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Роль *</label>
                                    <select value={editForm.subRole} onChange={e => setEditForm(f => ({ ...f, subRole: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                                        {DIST_SUBROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Новый пароль (опционально)</label>
                                    <input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                                        placeholder="Оставьте пустым"
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                                </div>
                            </div>
                            
                            <div className="border-t border-gray-100 pt-5">
                                <h4 className="font-bold text-gray-900 mb-3">Права доступа</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {PERM_LABELS.map(p => {
                                        const isChecked = (editPermissions as any)[p.key] || false;
                                        return (
                                            <label key={p.key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                                    {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{p.label}</span>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={isChecked}
                                                    onChange={() => setEditPermissions((prev: any) => ({ ...prev, [p.key]: !isChecked }))}
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setEditModal(null)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                                    Отмена
                                </button>
                                <button type="submit" disabled={editSaving}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {editSaving ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
