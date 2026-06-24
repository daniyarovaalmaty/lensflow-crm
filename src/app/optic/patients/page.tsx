'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Users, Search, Plus, Phone, FileText, Eye, RefreshCw, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getEffectiveClinicPermissions } from '@/types/user';
import AccessDenied from '@/components/ui/AccessDenied';
import QuickNav from '@/components/ui/QuickNav';

interface Patient {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    birthDate: string | null;
    gender: string | null;
    medmundusId: number | null;
    externalId: string | null;
    externalSource: string | null;
    createdAt: string;
    _count: { orders: number; prescriptions: number; consultations: number };
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

    // permissions visibility check
    const clinicPerms = session?.user ? getEffectiveClinicPermissions({
        subRole: session.user.subRole,
        permissions: session.user.permissions,
    }) : null;

    const [patients, setPatients] = useState<Patient[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [q, setQ] = useState('');
    const [showModal, setShowModal] = useState(false);
    const searchTimer = useRef<NodeJS.Timeout | undefined>(undefined);

    const [form, setForm] = useState({ name: '', phone: '', email: '', birthDate: '', gender: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [dedupMsg, setDedupMsg] = useState('');

    const handleDedup = async () => {
        if (!confirm('Объединить пациентов с одинаковым номером телефона? Дубли будут удалены.')) return;
        setIsSyncing(true);
        try {
            const res = await fetch('/api/patients/dedup', { method: 'POST' });
            const data = await res.json();
            setDedupMsg(data.message || 'Готово');
            setTimeout(() => setDedupMsg(''), 5000);
            load('', 1, false); // reload list
        } finally {
            setIsSyncing(false);
        }
    };

    const load = useCallback(async (query = '', pageNum = 1, noSync = false) => {
        if (pageNum === 1) {
            setIsLoading(true);
            if (!noSync) setIsSyncing(true);
        } else {
            setIsLoadingMore(true);
        }
        
        try {
            const params = new URLSearchParams({ q: query, page: pageNum.toString() });
            if (noSync || pageNum > 1) params.set('noSync', '1');
            
            const res = await fetch(`/api/patients?${params}`);
            const data = await res.json();
            
            if (pageNum === 1) {
                setPatients(data.patients || []);
            } else {
                setPatients(prev => [...prev, ...(data.patients || [])]);
            }
            
            setTotal(data.total || 0);
            setPage(data.page || pageNum);
            setHasMore(data.page < data.pages);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
            setIsSyncing(false);
        }
    }, []);

    useEffect(() => { load('', 1, false); }, [load]);

    const handleSearch = (val: string) => {
        setQ(val);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => load(val, 1, true), 400);
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasMore) {
            load(q, page + 1, true);
        }
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

    if (session?.user && clinicPerms && !clinicPerms.canViewPatients) {
        return <AccessDenied />;
    }

    return (
        <div className="min-h-screen bg-surface">
            <QuickNav />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Back button */}
                <div className="mb-6">
                    <Link
                        href="/optic/dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Назад на дашборд
                    </Link>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-emerald-600" />
                            Пациенты
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {isSyncing ? (
                                <span className="flex items-center gap-1.5 text-emerald-600">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Синхронизация с MedMundus...
                                </span>
                            ) : (
                                <span>Всего: <b>{total}</b> пациентов</span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDedup}
                            title="Объединить дубли по телефону"
                            className="p-2 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors text-xs flex items-center gap-1"
                        >
                            <span className="text-base">🔗</span>
                            <span className="hidden sm:inline">Дедубликация</span>
                        </button>
                        <button
                            onClick={() => load(q, 1, false)}
                            title="Синхронизировать с MedMundus"
                            className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
                        </button>
                        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Новый пациент
                        </button>

                    </div>
                </div>

                {/* Dedup result message */}
                {dedupMsg && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                        <span>✅</span> {dedupMsg}
                    </div>
                )}

                {/* Sync badge */}
                {!isSyncing && total > 0 && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        Данные синхронизированы с MedMundus · Нажмите 🔄 для обновления
                    </div>
                )}

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={q}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Поиск по имени или телефону..."
                        className="input pl-10 w-full"
                    />
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-4 h-16" />
                        ))}
                    </div>
                ) : patients.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-700 font-semibold">Пациентов пока нет</p>
                        <p className="text-gray-400 text-sm mt-1 mb-4">
                            {q
                                ? 'Ничего не найдено по запросу'
                                : 'Синхронизация с MedMundus завершена — добавьте первого пациента'}
                        </p>
                        <button onClick={() => setShowModal(true)} className="btn btn-primary">
                            Добавить пациента
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {patients.map(p => {
                            const lastRx = p.prescriptions[0];
                            const initials = p.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
                            return (
                                <Link
                                    key={p.id}
                                    href={`/optic/patients/${p.id}`}
                                    className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all group"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                            <span className="font-semibold text-gray-900 truncate">{p.name}</span>
                                            {p.birthDate && <span className="text-xs text-gray-400">{calcAge(p.birthDate)}</span>}
                                            {p.gender === 'male' && <span className="text-xs text-blue-400">♂</span>}
                                            {p.gender === 'female' && <span className="text-xs text-pink-400">♀</span>}
                                            {p.medmundusId && (
                                                <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-medium">MM</span>
                                            )}
                                            {p.externalSource === 'itigris' && (
                                                <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded font-medium">ITIGRIS</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
                                            <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{p._count.consultations} прием.</span>
                                            <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{p._count.orders} заказ.</span>
                                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p._count.prescriptions} рецепт.</span>
                                        </div>
                                    </div>
                                    {lastRx && (
                                        <div className="hidden sm:block text-right text-xs flex-shrink-0">
                                            <p className="font-mono text-gray-700">OD: {formatRx(lastRx.odSph, lastRx.odCyl)}</p>
                                            <p className="font-mono text-gray-700">OS: {formatRx(lastRx.osSph, lastRx.osCyl)}</p>
                                            <p className="text-gray-400">{new Date(lastRx.prescribedAt).toLocaleDateString('ru-RU')}</p>
                                        </div>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                                </Link>
                            );
                        })}
                        
                        {hasMore && (
                            <div className="pt-4 pb-2 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={isLoadingMore}
                                    className="btn btn-secondary w-full sm:w-auto px-8"
                                >
                                    {isLoadingMore ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Загрузка...
                                        </>
                                    ) : 'Показать еще'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* New Patient Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Новый пациент</h2>
                            <p className="text-xs text-emerald-600 mt-0.5">Будет добавлен в LensFlow и MedMundus</p>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                                <input type="text" required value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="input w-full" placeholder="Фамилия Имя Отчество" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон *</label>
                                    <input type="tel" required value={form.phone}
                                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                        className="input w-full" placeholder="+7 777 000 00 00" />
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
                                    <input type="date" value={form.birthDate}
                                        onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} className="input w-full" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        className="input w-full" placeholder="email@example.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Заметки / Анамнез</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="input w-full resize-none" rows={2} placeholder="Аллергии, особенности..." />
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
