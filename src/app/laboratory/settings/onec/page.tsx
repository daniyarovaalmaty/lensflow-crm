'use client';

import { useState, useEffect } from 'react';
import { Database, Check, X, RefreshCw, Loader2, AlertCircle, Plug, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OneCSettingsPage() {
    const [baseUrl, setBaseUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [connected, setConnected] = useState(false);
    const [connectedAt, setConnectedAt] = useState<string | null>(null);
    const [connectedUsername, setConnectedUsername] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const [testResult, setTestResult] = useState<{ ok: boolean; message: string; } | null>(null);
    const [error, setError] = useState<string | null>(null);

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
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

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
                body: JSON.stringify({ action: 'save', baseUrl, username, password }),
            });
            const data = await resp.json();
            if (data.ok) {
                setConnected(true);
                setConnectedAt(new Date().toISOString());
                setConnectedUsername(username);
                // Also do a test just to show success
                handleTest();
            } else {
                setError(data.error || 'Ошибка сохранения');
            }
        } catch {
            setError('Ошибка сохранения');
        }
        setSaving(false);
    };

    const handleDisconnect = async () => {
        if (!confirm('Отключить интеграцию с 1С? Данные не будут удалены, но связь прервется.')) return;
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
            setTestResult(null);
        } catch {
            setError('Ошибка отключения');
        }
        setDisconnecting(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8 flex items-center gap-4">
                <Link href="/laboratory/settings" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </Link>
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Database className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Интеграция с 1С</h1>
                    <p className="text-gray-500">Синхронизация справочников и заказов с вашей базой 1С</p>
                </div>
            </div>

            {connected ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                            <Check className="w-5 h-5" />
                            Подключено к 1С
                        </div>
                        <p className="text-green-600 text-sm">
                            Соединение установлено. Авторизован как: <span className="font-semibold">{connectedUsername}</span>.
                            <br />
                            Последнее подключение: {connectedAt ? new Date(connectedAt).toLocaleString('ru-RU') : 'неизвестно'}
                        </p>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                        Отключить
                    </button>
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 flex items-center gap-3 text-gray-500">
                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    Не подключено
                </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8">
                <h3 className="text-blue-900 font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Как получить доступ к API 1С OData
                </h3>
                <p className="text-blue-800 text-sm leading-relaxed">
                    LensFlow использует стандартный протокол 1C OData. 
                    Укажите базовый URL вашей 1С, имя пользователя и пароль. 
                    URL обычно имеет формат: <br />
                    <strong className="font-mono bg-blue-100 px-1 py-0.5 rounded">https://server/base_name</strong>. 
                    <br />(Система автоматически добавит <code className="font-mono text-xs">/odata/standard.odata</code> при запросах).
                    Пользователь должен иметь права на чтение справочника Номенклатуры и создание Реализаций.
                </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Параметры подключения</h2>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">URL сервера (baseUrl)</label>
                        <input
                            type="text"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://1cstart.itsheff.cloud/okeyvizhenjb94v"
                            className="w-full px-4 py-3 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Имя пользователя</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Главный бухгалтер"
                                className="w-full px-4 py-3 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full px-4 py-3 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                            <X className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {testResult && (
                        <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {testResult.ok ? <Check className="w-5 h-5 flex-shrink-0" /> : <X className="w-5 h-5 flex-shrink-0" />}
                            <div>
                                <div className="font-medium">{testResult.ok ? 'Соединение успешно' : 'Ошибка соединения'}</div>
                                <div className={testResult.ok ? 'text-green-600' : 'text-red-600'}>{testResult.message}</div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={handleTest}
                            disabled={testing || saving || !baseUrl || !username || !password}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 font-medium"
                        >
                            {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                            Проверить
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={testing || saving || !baseUrl || !username || !password}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 font-medium ml-auto"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
