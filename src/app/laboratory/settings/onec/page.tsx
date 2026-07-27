'use client';

import { useState, useEffect } from 'react';
import { Database, Check, X, RefreshCw, Loader2, AlertCircle, Unplug, Plug, ArrowLeft, Shield, Server, Activity } from 'lucide-react';
import Link from 'next/link';

interface SyncResult {
    entity: string;
    created: number;
    updated: number;
    errors: number;
    details: string[];
}

export default function OneCSettingsPage() {
    const [baseUrl, setBaseUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [exchangePlanName, setExchangePlanName] = useState('');
    const [nodeCode, setNodeCode] = useState('');

    const [connected, setConnected] = useState(false);
    const [connectedAt, setConnectedAt] = useState<string | null>(null);
    const [connectedUsername, setConnectedUsername] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const [testResult, setTestResult] = useState<{ ok: boolean; message: string; services?: any } | null>(null);
    const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [servicesStatus, setServicesStatus] = useState<any[] | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    // Load status on mount
    useEffect(() => {
        fetch('/api/onec')
            .then((r) => r.json())
            .then((data) => {
                setConnected(data.connected);
                setConnectedAt(data.connectedAt);
                setConnectedUsername(data.username);
                if (data.baseUrl) setBaseUrl(data.baseUrl);
                if (data.username) setUsername(data.username);
                if (data.exchangePlanName) setExchangePlanName(data.exchangePlanName);
                if (data.nodeCode) setNodeCode(data.nodeCode);
                
                if (data.connected) {
                    checkServicesStatus();
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const checkServicesStatus = async () => {
        setCheckingStatus(true);
        try {
            const resp = await fetch('/api/onec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'status' }),
            });
            const data = await resp.json();
            if (data.ok) {
                setServicesStatus(data.services);
            }
        } catch {
            // ignore
        }
        setCheckingStatus(false);
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        setError(null);
        try {
            const resp = await fetch('/api/onec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test', baseUrl, username, password }),
            });
            const data = await resp.json();
            setTestResult(data);
        } catch {
            setError('Ошибка при проверке подключения');
        }
        setTesting(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const resp = await fetch('/api/onec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save', baseUrl, username, password, exchangePlanName, nodeCode }),
            });
            const data = await resp.json();
            if (data.ok) {
                setConnected(true);
                setConnectedAt(new Date().toISOString());
                setConnectedUsername(username);
                checkServicesStatus();
            } else {
                setError(data.error || 'Ошибка сохранения');
            }
        } catch {
            setError('Ошибка сохранения');
        }
        setSaving(false);
    };

    const handleSync = async (type: string) => {
        setSyncing(true);
        setSyncResults(null);
        setError(null);
        try {
            const resp = await fetch('/api/onec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync', entity: type }),
            });
            const data = await resp.json();
            if (data.ok) {
                setSyncResults(data.results);
            } else {
                setError(data.error || 'Ошибка синхронизации');
            }
        } catch {
            setError('Ошибка синхронизации');
        }
        setSyncing(false);
    };

    const handleDisconnect = async () => {
        if (!confirm('Отключить интеграцию с 1С? Данные не будут удалены.')) return;
        setDisconnecting(true);
        try {
            await fetch('/api/onec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'disconnect' }),
            });
            setConnected(false);
            setConnectedAt(null);
            setConnectedUsername(null);
            setBaseUrl('');
            setUsername('');
            setPassword('');
            setExchangePlanName('');
            setNodeCode('');
            setSyncResults(null);
            setServicesStatus(null);
        } catch {}
        setDisconnecting(false);
    };

    const entityLabels: Record<string, string> = {
        catalogs: 'Справочники',
        documents: 'Документы',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <Link href="/laboratory/settings" className="text-gray-400 hover:text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Database className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Интеграция с 1С</h1>
                    <p className="text-sm text-gray-500">Синхронизация справочников и документов с 1С:Бухгалтерия</p>
                </div>
            </div>

            {/* Status Badge */}
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
                connected
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
            }`}>
                {connected ? (
                    <>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-green-700 font-medium">Подключено</span>
                        {connectedUsername && (
                            <span className="text-green-600 text-sm">
                                ({connectedUsername})
                            </span>
                        )}
                        {connectedAt && (
                            <span className="text-green-600 text-sm ml-auto">
                                с {new Date(connectedAt).toLocaleDateString('ru-RU')}
                            </span>
                        )}
                    </>
                ) : (
                    <>
                        <div className="w-3 h-3 bg-gray-400 rounded-full" />
                        <span className="text-gray-600 font-medium">Не подключено</span>
                    </>
                )}
            </div>

            {/* Auth Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Как получить доступ к API 1С</p>
                    <p>Укажите URL веб-сервисов 1С, имя пользователя и пароль. URL обычно имеет формат: <strong>https://server/base_name</strong>. Пользователь должен иметь права на выполнение синхронизации данных.</p>
                </div>
            </div>

            {/* Config Form */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Параметры подключения</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL сервера (baseUrl)
                        </label>
                        <input
                            type="text"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://1cstart.itsheff.cloud/okeyvizhenjb94v"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Имя пользователя
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="api_user"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Пароль
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                План обмена
                            </label>
                            <input
                                type="text"
                                value={exchangePlanName}
                                onChange={(e) => setExchangePlanName(e.target.value)}
                                placeholder="СинхронизацияДанныхЧерезУниверсальныйФормат"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Код узла
                            </label>
                            <input
                                type="text"
                                value={nodeCode}
                                onChange={(e) => setNodeCode(e.target.value)}
                                placeholder="LENSFLOW"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Errors */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Test Result */}
                {testResult && (
                    <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                        testResult.ok
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                        {testResult.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {testResult.message}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleTest}
                        disabled={!baseUrl || !username || !password || testing}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                        Проверить
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={!baseUrl || !username || !password || saving}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Сохранить
                    </button>

                    {connected && (
                        <button
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium text-red-600 disabled:opacity-50 flex items-center gap-2 transition-colors ml-auto"
                        >
                            {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                            Отключить
                        </button>
                    )}
                </div>
            </div>

            {/* Services Status Section */}
            {connected && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-gray-500" />
                            Статус сервисов
                        </h2>
                        <button
                            onClick={checkServicesStatus}
                            disabled={checkingStatus}
                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {checkingStatus && !servicesStatus ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {servicesStatus?.map((svc, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-sm font-medium text-gray-700 break-all">{svc.service}</span>
                                    <div className="flex items-center gap-1.5 ml-2">
                                        {svc.status === 'ok' ? (
                                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        ) : (
                                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                                        )}
                                        <span className={`text-xs font-medium ${svc.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                                            {svc.message}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {!servicesStatus && !checkingStatus && (
                                <div className="col-span-full text-sm text-gray-500 text-center py-2">
                                    Нет данных о статусе сервисов
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Sync Section */}
            {connected && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Синхронизация</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleSync('catalogs')}
                                disabled={syncing}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
                            >
                                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Справочники
                            </button>
                            <button
                                onClick={() => handleSync('documents')}
                                disabled={syncing}
                                className="px-4 py-2.5 bg-white border border-indigo-300 hover:bg-indigo-50 rounded-lg text-sm font-medium text-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                            >
                                <Server className="w-4 h-4" />
                                Документы
                            </button>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 mb-4">
                        <strong>Справочники</strong> — импорт контрагентов, номенклатуры и других классификаторов.{' '}
                        <strong>Документы</strong> — выгрузка реализаций, ПКО и других документов в 1С.
                    </p>

                    {/* Sync Results */}
                    {syncResults && (
                        <div className="space-y-3 mt-4">
                            {syncResults.map((r, i) => (
                                <div key={i} className="p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-900">
                                            {entityLabels[r.entity] || r.entity}
                                        </span>
                                        <div className="flex gap-3 text-xs">
                                            {r.created > 0 && (
                                                <span className="text-green-600">+{r.created} создано</span>
                                            )}
                                            {r.updated > 0 && (
                                                <span className="text-blue-600">↻ {r.updated} обновлено</span>
                                            )}
                                            {r.errors > 0 && (
                                                <span className="text-red-600">⚠ {r.errors} ошибок</span>
                                            )}
                                            {r.created === 0 && r.updated === 0 && r.errors === 0 && (
                                                <span className="text-gray-400">Без изменений</span>
                                            )}
                                        </div>
                                    </div>
                                    {r.details.length > 0 && (
                                        <div className="text-xs text-gray-500 space-y-1 mt-2">
                                            {r.details.slice(0, 5).map((d, j) => (
                                                <div key={j}>• {d}</div>
                                            ))}
                                            {r.details.length > 5 && (
                                                <div className="text-gray-400">...и ещё {r.details.length - 5}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
