'use client';

import { useState, useEffect } from 'react';
import { Link2, Check, X, RefreshCw, Loader2, AlertCircle, Unplug, Plug, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SyncResult {
    entity: string;
    created: number;
    updated: number;
    errors: number;
    details: string[];
}

export default function ItigrisSettingsPage() {
    const [baseUrl, setBaseUrl] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [branchId, setBranchId] = useState('');

    const [connected, setConnected] = useState(false);
    const [connectedAt, setConnectedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
    const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load status on mount
    useEffect(() => {
        fetch('/api/itigris')
            .then((r) => r.json())
            .then((data) => {
                setConnected(data.connected);
                setConnectedAt(data.connectedAt);
                if (data.baseUrl) setBaseUrl(data.baseUrl);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        setError(null);
        try {
            const resp = await fetch('/api/itigris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test', baseUrl, apiToken }),
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
            const resp = await fetch('/api/itigris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save', baseUrl, apiToken, branchId }),
            });
            const data = await resp.json();
            if (data.ok) {
                setConnected(true);
                setConnectedAt(new Date().toISOString());
            } else {
                setError(data.error || 'Ошибка сохранения');
            }
        } catch {
            setError('Ошибка сохранения');
        }
        setSaving(false);
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncResults(null);
        setError(null);
        try {
            const resp = await fetch('/api/itigris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync' }),
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
        if (!confirm('Отключить ITIGRIS? Данные не будут удалены.')) return;
        setDisconnecting(true);
        try {
            await fetch('/api/itigris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'disconnect' }),
            });
            setConnected(false);
            setConnectedAt(null);
            setBaseUrl('');
            setApiToken('');
            setBranchId('');
            setSyncResults(null);
        } catch {}
        setDisconnecting(false);
    };

    const entityLabels: Record<string, string> = {
        clients: 'Пациенты',
        orders: 'Заказы',
        prescriptions: 'Рецепты',
        products: 'Товары',
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
                <Link href="/optic/dashboard" className="text-gray-400 hover:text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Интеграция с ITIGRIS</h1>
                    <p className="text-sm text-gray-500">Синхронизация пациентов, заказов и рецептов</p>
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

            {/* Config Form */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Параметры подключения</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL ITIGRIS API
                        </label>
                        <input
                            type="url"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://myoptika.itigris.cloud/api/v2"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-1">Получите у менеджера ITIGRIS</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            API-токен
                        </label>
                        <input
                            type="password"
                            value={apiToken}
                            onChange={(e) => setApiToken(e.target.value)}
                            placeholder="Bearer токен"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ID филиала <span className="text-gray-400">(опционально)</span>
                        </label>
                        <input
                            type="text"
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            placeholder="ID центрального офиса"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
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
                        disabled={!baseUrl || !apiToken || testing}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                        Проверить подключение
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={!baseUrl || !apiToken || saving}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
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

            {/* Sync Section */}
            {connected && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Синхронизация</h2>
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2 transition-colors"
                        >
                            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            {syncing ? 'Синхронизация...' : 'Синхронизировать сейчас'}
                        </button>
                    </div>

                    <p className="text-sm text-gray-500 mb-4">
                        Импортирует пациентов, заказы и рецепты из ITIGRIS в LensFlow. Существующие данные обновятся, новые — создадутся.
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
