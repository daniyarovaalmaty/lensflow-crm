'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Mail, Phone, X, User } from 'lucide-react';

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

export default function DistributorStaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', subRole: 'dist_manager', password: '',
    });

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
            const res = await fetch('/api/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, role: 'distributor' }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Ошибка'); return; }
            setShowModal(false);
            setForm({ fullName: '', email: '', phone: '', subRole: 'dist_manager', password: '' });
            loadStaff();
        } finally { setSaving(false); }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Сотрудники</h1>
                    <p className="text-gray-500 mt-1">Управление командой дистрибьютора</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Добавить сотрудника
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-400">Загрузка...</div>
                ) : staff.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>Сотрудников пока нет</p>
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
                            <h3 className="font-bold text-gray-900">Добавить сотрудника</h3>
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
                                    {saving ? 'Добавление...' : 'Добавить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
