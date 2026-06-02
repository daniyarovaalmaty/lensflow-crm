'use client';

import { useState, useEffect, useCallback } from 'react';
import QuickNav from '@/components/ui/QuickNav';
import { Users, Search, RefreshCw, ExternalLink, Phone, Mail } from 'lucide-react';

interface Patient {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    birthDate: string | null;
    gender: string | null;
    externalId: string | null;
    externalSource: string | null;
    createdAt: string;
    _count: { orders: number };
}

export default function ClinicManagerPatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [source, setSource] = useState('all');
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ search, page: String(page), source });
            const res = await fetch(`/api/clinic-manager/patients?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPatients(data.patients);
                setTotal(data.total);
                setPages(data.pages);
            }
        } finally {
            setLoading(false);
        }
    }, [search, page, source]);

    useEffect(() => { loadData(); }, [loadData]);

    const fmtDate = (s: string) => new Date(s).toLocaleDateString('ru-RU');

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-6 h-6 text-indigo-600" />
                            Пациенты
                            <span className="text-base font-normal text-gray-400 ml-1">({total})</span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Список пациентов клиники</p>
                    </div>
                    <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                        <RefreshCw className="w-4 h-4" /> Обновить
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-5 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Поиск по имени или телефону..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>
                    {['all', 'itigris'].map(s => (
                        <button key={s} onClick={() => { setSource(s); setPage(1); }} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${source === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                            {s === 'all' ? 'Все' : '📥 Из ITIGRIS'}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                ) : patients.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Пациенты не найдены</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {patients.map(p => (
                            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-900 text-sm truncate">{p.name}</div>
                                        {p.externalSource === 'itigris' && (
                                            <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200">ITIGRIS</span>
                                        )}
                                    </div>
                                    <a href={`/optic/patients/${p.id}`} className="text-gray-300 hover:text-indigo-500 transition-colors ml-2 flex-shrink-0" title="Открыть карточку">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                                <div className="space-y-1.5">
                                    {p.phone && (
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                            <a href={`tel:${p.phone}`} className="hover:text-indigo-600">{p.phone}</a>
                                        </div>
                                    )}
                                    {p.email && (
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                            <span className="truncate">{p.email}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                                    <span>Заказов: {p._count.orders}</span>
                                    <span>{fmtDate(p.createdAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pages > 1 && (
                    <div className="flex justify-center gap-1.5 mt-6">
                        {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${page === p ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{p}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
