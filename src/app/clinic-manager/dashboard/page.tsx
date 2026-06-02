'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import QuickNav from '@/components/ui/QuickNav';
import { Users, ClipboardList, Link2, RefreshCw, TrendingUp, CheckCircle, AlertCircle, Clock, ArrowRight, Zap } from 'lucide-react';

interface Stats {
    itigrisConnected: boolean;
    itigrisCompany: string | null;
    itigrisConnectedAt: string | null;
    lastSyncAt: string | null;
    stats: {
        patientsTotal: number;
        patientsFromItigris: number;
        ordersTotal: number;
        ordersFromItigris: number;
        monthlyRevenue: number;
    };
}

interface SyncLog {
    id: string;
    syncedAt: string;
    entity: string;
    created: number;
    updated: number;
    errors: number;
    durationMs: number | null;
}

export default function ClinicManagerDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [statsRes, itigrisRes] = await Promise.all([
                fetch('/api/clinic-manager/stats'),
                fetch('/api/clinic-manager/itigris'),
            ]);
            if (statsRes.ok) setStats(await statsRes.json());
            if (itigrisRes.ok) {
                const d = await itigrisRes.json();
                setSyncLogs(d.syncLogs || []);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleQuickSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/clinic-manager/itigris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync' }),
            });
            if (res.ok) await loadData();
        } finally {
            setSyncing(false);
        }
    };

    const fmt = (n: number) => n.toLocaleString('ru-RU');
    const fmtMoney = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 0 }) + ' ₸';
    const fmtDate = (s: string) => new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Руководитель клиники</h1>
                        <p className="text-sm text-gray-500 mt-1">Обзор показателей и управление интеграциями</p>
                    </div>
                    {stats?.itigrisConnected && (
                        <button onClick={handleQuickSync} disabled={syncing} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50 transition-colors">
                            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Синхронизация...' : 'Синхронизировать ITIGRIS'}
                        </button>
                    )}
                </div>

                {/* ITIGRIS Status Banner */}
                <div className={`rounded-2xl p-4 mb-6 flex items-center justify-between flex-wrap gap-4 ${
                    stats?.itigrisConnected
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-amber-50 border border-amber-200'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            stats?.itigrisConnected ? 'bg-emerald-100' : 'bg-amber-100'
                        }`}>
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                            ) : stats?.itigrisConnected ? (
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                            )}
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900 text-sm">
                                ITIGRIS Optima {stats?.itigrisConnected ? `— ${stats.itigrisCompany}` : '— Не подключено'}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                {stats?.itigrisConnected
                                    ? `Синхронизировано: ${stats.lastSyncAt ? fmtDate(stats.lastSyncAt) : 'ещё не выполнялась'}`
                                    : 'Подключите ITIGRIS чтобы импортировать пациентов и заказы'}
                            </div>
                        </div>
                    </div>
                    <Link href="/clinic-manager/itigris" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors no-underline">
                        <Link2 className="w-4 h-4" />
                        {stats?.itigrisConnected ? 'Настройки интеграции' : 'Подключить ITIGRIS'}
                    </Link>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Пациентов', value: loading ? '—' : fmt(stats?.stats.patientsTotal || 0), sub: `${fmt(stats?.stats.patientsFromItigris || 0)} из ITIGRIS`, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/clinic-manager/patients' },
                        { label: 'Заказов', value: loading ? '—' : fmt(stats?.stats.ordersTotal || 0), sub: `${fmt(stats?.stats.ordersFromItigris || 0)} из ITIGRIS`, icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50', href: '/clinic-manager/orders' },
                        { label: 'Выручка за месяц', value: loading ? '—' : fmtMoney(stats?.stats.monthlyRevenue || 0), sub: 'Текущий месяц', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', href: null },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                                </div>
                                {kpi.href && (
                                    <Link href={kpi.href} className="text-gray-400 hover:text-gray-600 transition-colors">
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                )}
                            </div>
                            <div className="text-2xl font-bold text-gray-900 mb-0.5">{kpi.value}</div>
                            <div className="text-sm text-gray-500">{kpi.label}</div>
                            <div className={`text-xs mt-1 font-medium ${kpi.color}`}>{kpi.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Two columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" /> Быстрые действия
                        </h2>
                        <div className="flex flex-col gap-2">
                            {[
                                { href: '/clinic-manager/itigris', label: 'Управление ITIGRIS', sub: 'Подключение, синхронизация', icon: Link2, color: 'text-orange-500', bg: 'bg-orange-50' },
                                { href: '/clinic-manager/patients', label: 'Пациенты клиники', sub: 'Все пациенты + импортированные', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                { href: '/clinic-manager/orders', label: 'Заказы клиники', sub: 'Все заказы + из ITIGRIS', icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50' },
                            ].map((item, i) => (
                                <Link key={i} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group no-underline">
                                    <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                                        <item.icon className={`w-4 h-4 ${item.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900">{item.label}</div>
                                        <div className="text-xs text-gray-500">{item.sub}</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Sync History */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500" /> История синхронизаций
                        </h2>
                        {loading ? (
                            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" /></div>
                        ) : syncLogs.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">Синхронизации не выполнялись</div>
                        ) : (
                            <div className="flex flex-col gap-0">
                                {syncLogs.slice(0, 6).map((log, i) => (
                                    <div key={log.id} className={`flex items-center justify-between py-2.5 ${i < syncLogs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                        <div>
                                            <div className="text-xs text-gray-500 mb-1">{fmtDate(log.syncedAt)}</div>
                                            <div className="flex gap-3 text-xs font-medium">
                                                {log.created > 0 && <span className="text-emerald-600">+{log.created} создано</span>}
                                                {log.updated > 0 && <span className="text-indigo-600">↻ {log.updated} обновлено</span>}
                                                {log.errors > 0 && <span className="text-red-600">⚠ {log.errors} ошибок</span>}
                                                {log.created === 0 && log.updated === 0 && log.errors === 0 && <span className="text-gray-400">Без изменений</span>}
                                            </div>
                                        </div>
                                        {log.durationMs && <span className="text-xs text-gray-400">{(log.durationMs / 1000).toFixed(1)}с</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
