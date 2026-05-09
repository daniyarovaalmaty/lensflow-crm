'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, Search, Plus, Phone, FileText, Eye, Calendar, ChevronRight, User } from 'lucide-react';
import OpticNav from '@/components/layout/OpticNav';
import Link from 'next/link';

interface Patient {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    birthDate: string | null;
    gender: string | null;
    createdAt: string;
    _count: { orders: number; prescriptions: number };
    prescriptions: Array<{
        odSph: number | null; odCyl: number | null;
        osSph: number | null; osCyl: number | null;
        prescribedAt: string;
    }>;
}

function formatRx(sph: number | null, cyl: number | null) {
    if (sph == null) return '—';
    const s = sph > 0 ? `+${sph.toFixed(2)}` : sph.toFixed(2);
    if (cyl == null || cyl === 0) return s;
    const c = cyl > 0 ? `+${cyl.toFixed(2)}` : cyl.toFixed(2);
    return `${s} ${c}`;
}

function calcAge(birthDate: string | null): string {
    if (!birthDate) return '';
    const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000);
    return `${age} лет`;
}

export default function PatientsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [q, setQ] = useState('');
    const [showModal, setShowModal] = useState(false);

    // New patient form
    const [form, setForm] = useState({ name: '', phone: '', email: '', birthDate: '', gender: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async (query = q) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setPatients(data.patients || []);
            setTotal(data.total || 0);
        } finally {
            setIsLoading(false);
        }
    }, [q]);

    useEffect(() => { load(); }, []);

    const handleSearch = (val: string) => {
        setQ(val);
        const timer = setTimeout(() => load(val), 400);
        return () => clearTimeout(timer);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                const patient = await res.json();
                setShowModal(false);
                setForm({ name: '', phone: '', email: '', birthDate: '', gender: '', notes: '' });
                router.push(`/optic/patients/${patient.id}`);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface">
            <OpticNav />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-primary-600" />
                            Пациенты
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Всего: {total} пациентов</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Новый пациент
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={q}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Поиск по имени или телефону..."
                        className="input pl-10 w-full"
                    />
                </div>

                {/* Patient List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="skeleton h-20 rounded-xl" />
                        ))}
                    </div>
                ) : patients.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Пациентов не найдено</p>
                        <p className="text-gray-400 text-sm mt-1">Добавьте первого пациента</p>
                        <button onClick={() => setShowModal(true)} className="btn btn-primary mt-4">
                            Добавить пациента
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {patients.map(p => {
                            const lastRx = p.prescriptions[0];
                            return (
                                <Link key={p.id} href={`/optic/patients/${p.id}`}
                                    className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all group">
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            {p.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-gray-900">{p.name}</span>
                                                {p.birthDate && (
                                                    <span className="text-xs text-gray-400">{calcAge(p.birthDate)}</span>
                                                )}
                                                {p.gender === 'male' && <span className="text-xs text-blue-500">♂</span>}
                                                {p.gender === 'female' && <span className="text-xs text-pink-500">♀</span>}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{p.phone}</span>
                                                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{p._count.orders} заказов</span>
                                                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{p._count.prescriptions} рецептов</span>
                                            </div>
                                        </div>
                                        {/* Last Rx */}
                                        {lastRx && (
                                            <div className="hidden sm:block text-right text-xs text-gray-500 flex-shrink-0">
                                                <p className="font-mono text-gray-700 text-sm">
                                                    OD: {formatRx(lastRx.odSph, lastRx.odCyl)}
                                                </p>
                                                <p className="font-mono text-gray-700 text-sm">
                                                    OS: {formatRx(lastRx.osSph, lastRx.osCyl)}
                                                </p>
                                                <p className="text-gray-400 mt-0.5">
                                                    {new Date(lastRx.prescribedAt).toLocaleDateString('ru-RU')}
                                                </p>
                                            </div>
                                        )}
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* New Patient Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Новый пациент</h2>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                                <input
                                    type="text" required
                                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="input w-full" placeholder="Фамилия Имя Отчество"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон *</label>
                                    <input
                                        type="tel" required
                                        value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                        className="input w-full" placeholder="+7 777 123 45 67"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
                                    <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="input w-full">
                                        <option value="">Не указан</option>
                                        <option value="male">Мужской</option>
                                        <option value="female">Женский</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Дата рождения</label>
                                    <input
                                        type="date"
                                        value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                                        className="input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        className="input w-full" placeholder="email@example.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Заметки</label>
                                <textarea
                                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="input w-full resize-none" rows={2} placeholder="Аллергии, особенности..."
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Отмена</button>
                                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                                    {saving ? 'Создание...' : 'Создать'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
