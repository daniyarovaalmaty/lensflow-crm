'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import QuickNav from '@/components/ui/QuickNav';
import { Link2, Check, X, RefreshCw, Loader2, AlertCircle, Unplug, Plug, Shield, ChevronDown, ChevronUp, Clock, Zap, ClipboardList, Package, Send } from 'lucide-react';

interface SyncResult {
    entity: string;
    created: number;
    updated: number;
    errors: number;
    details: string[];
}

interface SyncLog {
    id: string;
    syncedAt: string;
    entity: string;
    created: number;
    updated: number;
    errors: number;
    durationMs: number | null;
    details: any;
}

export default function ClinicManagerItigrisPage() {
    const [company, setCompany] = useState('');
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [connected, setConnected] = useState(false);
    const [connectedAt, setConnectedAt] = useState<string | null>(null);
    const [connectedLogin, setConnectedLogin] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
    const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);
    const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [stats, setStats] = useState<{ patientsCount: number; ordersCount: number } | null>(null);
    // Legacy (key-based) external API
    const [legacyClient, setLegacyClient] = useState('');
    const [legacyKey, setLegacyKey] = useState('');
    const [legacyConnected, setLegacyConnected] = useState(false);
    const [testingLegacy, setTestingLegacy] = useState(false);
    const [savingLegacy, setSavingLegacy] = useState(false);
    const [legacyResult, setLegacyResult] = useState<{ ok: boolean; message: string } | null>(null);
    // RemoteAPI (separate key — catalog + two-way cluster)
    const [remoteKey, setRemoteKey] = useState('');
    const [remoteConnected, setRemoteConnected] = useState(false);
    const [testingRemote, setTestingRemote] = useState(false);
    const [savingRemote, setSavingRemote] = useState(false);
    const [remoteResult, setRemoteResult] = useState<{ ok: boolean; message: string } | null>(null);

    const loadData = useCallback(async () => {
        try {
            const res = await fetch('/api/clinic-manager/itigris');
            if (res.ok) {
                const data = await res.json();
                setConnected(data.connected);
                setConnectedAt(data.connectedAt);
                setConnectedLogin(data.login);
                if (data.company) setCompany(data.company);
                if (data.login) setLogin(data.login);
                if (data.departmentId) setDepartmentId(String(data.departmentId));
                setSyncLogs(data.syncLogs || []);
                setStats(data.stats);
                if (data.legacyClient) setLegacyClient(data.legacyClient);
                setLegacyConnected(!!data.legacyConnected);
                setRemoteConnected(!!data.remoteConnected);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const post = async (body: object) => fetch('/api/clinic-manager/itigris', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });

    const handleTest = async () => {
        setTesting(true); setTestResult(null); setError(null);
        try { setTestResult(await (await post({ action: 'test', company, login, password, departmentId })).json()); }
        catch { setError('Ошибка при проверке подключения'); }
        setTesting(false);
    };

    const handleSave = async () => {
        setSaving(true); setError(null);
        try {
            const data = await (await post({ action: 'save', company, login, password, departmentId })).json();
            if (data.ok) { setConnected(true); setConnectedAt(new Date().toISOString()); setConnectedLogin(login); }
            else setError(data.error || 'Ошибка сохранения');
        } catch { setError('Ошибка сохранения'); }
        setSaving(false);
    };

    const handleSync = async (delta = false) => {
        setSyncing(true); setSyncResults(null); setError(null);
        try {
            const action = delta ? 'sync_delta' : 'sync';
            const since = delta && syncLogs.length > 0 ? syncLogs[0].syncedAt : undefined;
            const data = await (await post({ action, since })).json();
            if (data.ok) { setSyncResults(data.results); await loadData(); }
            else setError(data.error || 'Ошибка синхронизации');
        } catch { setError('Ошибка синхронизации'); }
        setSyncing(false);
    };

    const handleSyncProducts = async () => {
        setSyncing(true); setSyncResults(null); setError(null);
        try {
            const data = await (await post({ action: 'sync_products' })).json();
            if (data.ok) { setSyncResults(data.results); await loadData(); }
            else setError(data.error || 'Ошибка синхронизации товаров');
        } catch { setError('Ошибка синхронизации товаров'); }
        setSyncing(false);
    };

    const handleDisconnect = async () => {
        if (!confirm('Отключить ITIGRIS? Импортированные данные останутся.')) return;
        setDisconnecting(true);
        try {
            await post({ action: 'disconnect' });
            setConnected(false); setConnectedAt(null); setConnectedLogin(null);
            setCompany(''); setLogin(''); setPassword(''); setDepartmentId(''); setSyncResults(null);
        } catch {}
        setDisconnecting(false);
    };

    const handleTestLegacy = async () => {
        setTestingLegacy(true); setLegacyResult(null);
        try { setLegacyResult(await (await post({ action: 'test_legacy', legacyClient: legacyClient || company, legacyKey })).json()); }
        catch { setLegacyResult({ ok: false, message: 'Ошибка проверки' }); }
        setTestingLegacy(false);
    };

    const handleSaveLegacy = async () => {
        setSavingLegacy(true);
        try {
            const d = await (await post({ action: 'save_legacy', legacyClient: legacyClient || company, legacyKey })).json();
            if (d.ok) { setLegacyConnected(true); setLegacyResult({ ok: true, message: d.message || 'Сохранено' }); }
            else setLegacyResult({ ok: false, message: d.error || 'Ошибка сохранения' });
        } catch { setLegacyResult({ ok: false, message: 'Ошибка сохранения' }); }
        setSavingLegacy(false);
    };

    const handleTestRemote = async () => {
        setTestingRemote(true); setRemoteResult(null);
        try { setRemoteResult(await (await post({ action: 'test_remote', remoteClient: legacyClient || company, remoteKey })).json()); }
        catch { setRemoteResult({ ok: false, message: 'Ошибка проверки' }); }
        setTestingRemote(false);
    };

    const handleSaveRemote = async () => {
        setSavingRemote(true);
        try {
            const d = await (await post({ action: 'save_remote', remoteClient: legacyClient || company, remoteKey })).json();
            if (d.ok) { setRemoteConnected(true); setRemoteResult({ ok: true, message: d.message || 'Сохранено' }); }
            else setRemoteResult({ ok: false, message: d.error || 'Ошибка сохранения' });
        } catch { setRemoteResult({ ok: false, message: 'Ошибка сохранения' }); }
        setSavingRemote(false);
    };

    const handleSyncProductsLegacy = async () => {
        setSyncing(true); setSyncResults(null); setError(null);
        try {
            const data = await (await post({ action: 'sync_products_legacy' })).json();
            if (data.ok) { setSyncResults(data.results); await loadData(); }
            else setError(data.error || 'Ошибка синхронизации каталога (RemoteAPI)');
        } catch { setError('Ошибка синхронизации каталога (RemoteAPI)'); }
        setSyncing(false);
    };

    const entityLabels: Record<string, string> = { clients: 'Пациенты', orders: 'Заказы', prescriptions: 'Рецепты', full: 'Полная синхронизация', products: 'Товары (каталог)' };
    const fmtDate = (s: string) => new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Интеграция ITIGRIS Optima</h1>
                        <p className="text-sm text-gray-500">Синхронизация пациентов и заказов с Оптимой v.2</p>
                    </div>
                    {(connected || legacyConnected || remoteConnected) && (
                        <div className="ml-auto flex items-center gap-2">
                            {connected && (
                                <Link href="/clinic-manager/itigris/browse" className="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors">
                                    <ClipboardList className="w-4 h-4" /> Данные
                                </Link>
                            )}
                            {legacyConnected && (
                                <Link href="/clinic-manager/itigris/services" className="flex items-center gap-2 px-3 py-2 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl text-sm font-medium transition-colors">
                                    <Zap className="w-4 h-4" /> Сервисы
                                </Link>
                            )}
                            {remoteConnected && (
                                <Link href="/optic/sale-to-optima" className="flex items-center gap-2 px-3 py-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-medium transition-colors">
                                    <Send className="w-4 h-4" /> Заказ в Оптиму
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats when connected */}
                {stats && connected && (
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        {[
                            { label: 'Пациентов синхронизировано', value: stats.patientsCount, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Заказов из ITIGRIS', value: stats.ordersCount, color: 'text-violet-600', bg: 'bg-violet-50' },
                        ].map((st, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
                                <span className={`text-3xl font-bold ${st.color}`}>{st.value.toLocaleString()}</span>
                                <span className="text-xs text-gray-500 leading-tight">{st.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Status badge */}
                <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 ${connected ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                        <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    )}
                    <span className={`font-medium text-sm ${connected ? 'text-emerald-700' : 'text-gray-600'}`}>
                        {connected ? `Подключено${connectedLogin ? ` — ${connectedLogin}` : ''}` : 'Не подключено'}
                    </span>
                    {connectedAt && connected && (
                        <span className="text-emerald-600 text-xs ml-auto">с {fmtDate(connectedAt)}</span>
                    )}
                </div>

                {/* Info box */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
                    <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 leading-relaxed">
                        <span className="font-semibold">Как получить доступ:</span> Создайте пользователя в Оптиме с ролью <strong>Секретарь</strong> и отключённым доступом по сертификату. ID департамента найдите в настройках Оптимы.
                    </div>
                </div>

                {/* Config form */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                    <h2 className="text-base font-semibold text-gray-900 mb-5">Параметры подключения</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Приложение (company)</label>
                            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="neweye" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                            <p className="text-xs text-gray-400 mt-1">Название вашего приложения в ITIGRIS</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Логин</label>
                                <input value={login} onChange={e => setLogin(e.target.value)} placeholder="api_user" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Пароль</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ID Департамента</label>
                            <input type="number" value={departmentId} onChange={e => setDepartmentId(e.target.value)} placeholder="1000000001" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                        </div>
                    )}
                    {testResult && (
                        <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm ${testResult.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                            {testResult.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            {testResult.message}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 mt-5">
                        <button onClick={handleTest} disabled={!company || !login || !password || testing} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors">
                            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Проверить
                        </button>
                        <button onClick={handleSave} disabled={!company || !login || !password || saving} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-colors">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Сохранить
                        </button>
                        {connected && (
                            <button onClick={handleDisconnect} disabled={disconnecting} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium text-red-600 disabled:opacity-50 transition-colors ml-auto">
                                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />} Отключить
                            </button>
                        )}
                    </div>
                </div>

                {/* Legacy (key-based) external API */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-base font-semibold text-gray-900">Внешнее (легаси) API</h2>
                        {legacyConnected && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Подключено</span>}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Ключ-доступ к сервисам: остатки линз, статус заказа, бонусы и скидка по дисконтной карте.</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Компания (легаси)</label>
                            <input value={legacyClient} onChange={e => setLegacyClient(e.target.value)} placeholder={company || 'optika_narodnaya'} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Легаси-ключ</label>
                            <input type="password" value={legacyKey} onChange={e => setLegacyKey(e.target.value)} placeholder={legacyConnected ? '•••••••• (сохранён)' : 'key'} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                        </div>
                    </div>
                    {legacyResult && (
                        <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm ${legacyResult.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                            {legacyResult.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />} {legacyResult.message}
                        </div>
                    )}
                    <div className="flex gap-3 mt-5">
                        <button onClick={handleTestLegacy} disabled={!legacyKey || testingLegacy} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors">
                            {testingLegacy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Проверить
                        </button>
                        <button onClick={handleSaveLegacy} disabled={!legacyKey || savingLegacy} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-colors">
                            {savingLegacy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Сохранить
                        </button>
                    </div>
                </div>

                {/* RemoteAPI (separate key — catalog + two-way cluster) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-base font-semibold text-gray-900">RemoteAPI (каталог + двусторонние)</h2>
                        {remoteConnected && <span className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Подключено</span>}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Отдельный ключ «для интернет-магазина и мобильного приложения» (выдаёт поддержка Itigris). Открывает каталог товаров и двусторонние сценарии (запись на приём, заказы, бонусы, СМС). Это НЕ легаси-ключ выше.</p>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">RemoteAPI-ключ</label>
                        <input type="password" value={remoteKey} onChange={e => setRemoteKey(e.target.value)} placeholder={remoteConnected ? '•••••••• (сохранён)' : 'remote api key'} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    {remoteResult && (
                        <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm ${remoteResult.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                            {remoteResult.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />} {remoteResult.message}
                        </div>
                    )}
                    <div className="flex gap-3 mt-5">
                        <button onClick={handleTestRemote} disabled={!remoteKey || testingRemote} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors">
                            {testingRemote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Проверить
                        </button>
                        <button onClick={handleSaveRemote} disabled={!remoteKey || savingRemote} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-colors">
                            {savingRemote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Сохранить
                        </button>
                        {remoteConnected && (
                            <button onClick={handleSyncProductsLegacy} disabled={syncing} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-orange-300 hover:bg-orange-50 rounded-xl text-sm font-medium text-orange-700 disabled:opacity-50 transition-colors ml-auto">
                                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} Товары (RemoteAPI)
                            </button>
                        )}
                    </div>
                </div>

                {/* Sync section */}
                {connected && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" /> Синхронизация
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={() => handleSync(true)} disabled={syncing || syncLogs.length === 0} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-sm font-medium text-indigo-700 disabled:opacity-50 transition-colors">
                                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Обновление
                                </button>
                                <button onClick={() => handleSync(false)} disabled={syncing} className="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-colors">
                                    {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                    {syncing ? 'Синхронизация...' : 'Полная'}
                                </button>
                                <button onClick={handleSyncProducts} disabled={syncing} className="flex items-center gap-2 px-3 py-2 bg-white border border-orange-300 hover:bg-orange-50 rounded-xl text-sm font-medium text-orange-700 disabled:opacity-50 transition-colors">
                                    <Package className="w-3.5 h-3.5" /> Товары
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-5">
                            «Полная»/«Обновление» — клиенты и заказы из ITIGRIS → LensFlow. «Товары» — каталог из остатков
                            ITIGRIS (оправы, линзы, КЛ, аксессуары) с количеством и ценой; требует у пользователя ITIGRIS доступ к складу.
                        </p>

                        {syncResults && (
                            <div className="mb-5 space-y-2">
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Результат</div>
                                {syncResults.map((r, i) => (
                                    <div key={i} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-900">{entityLabels[r.entity] || r.entity}</span>
                                        <div className="flex gap-3 text-xs font-medium">
                                            {r.created > 0 && <span className="text-emerald-600">+{r.created}</span>}
                                            {r.updated > 0 && <span className="text-indigo-600">↻ {r.updated}</span>}
                                            {r.errors > 0 && <span className="text-red-600">⚠ {r.errors}</span>}
                                            {r.created === 0 && r.updated === 0 && r.errors === 0 && <span className="text-gray-400">Без изменений</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sync history */}
                        <div>
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Clock className="w-3 h-3" /> История синхронизаций
                            </div>
                            {syncLogs.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-sm">Синхронизации не выполнялись</div>
                            ) : (
                                <div className="space-y-1.5">
                                    {syncLogs.map((log) => (
                                        <div key={log.id} className="bg-gray-50 rounded-xl overflow-hidden">
                                            <div onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
                                                <span className="text-xs text-gray-500 min-w-[110px]">{fmtDate(log.syncedAt)}</span>
                                                <div className="flex gap-3 flex-1 text-xs font-medium">
                                                    {log.created > 0 && <span className="text-emerald-600">+{log.created}</span>}
                                                    {log.updated > 0 && <span className="text-indigo-600">↻{log.updated}</span>}
                                                    {log.errors > 0 && <span className="text-red-600">⚠{log.errors}</span>}
                                                    {log.created === 0 && log.updated === 0 && log.errors === 0 && <span className="text-gray-400">—</span>}
                                                </div>
                                                {log.durationMs && <span className="text-xs text-gray-400">{(log.durationMs / 1000).toFixed(1)}с</span>}
                                                {expandedLog === log.id ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                            </div>
                                            {expandedLog === log.id && Array.isArray(log.details) && (
                                                <div className="px-4 pb-3 border-t border-gray-200 pt-2 space-y-1">
                                                    {log.details.map((r: any, i: number) => (
                                                        <div key={i} className="text-xs text-gray-500">
                                                            {entityLabels[r.entity] || r.entity}: +{r.created} / ↻{r.updated} / ⚠{r.errors}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
