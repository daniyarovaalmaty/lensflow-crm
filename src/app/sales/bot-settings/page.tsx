'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Bot, Save, MessageSquare, Send, RefreshCw,
    Settings, HelpCircle, Briefcase, CheckCircle, Loader2,
    ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';

interface BotConfig {
    id: string;
    key: string;
    label: string;
    value: string;
    category: string;
}

interface ChatMsg {
    role: 'user' | 'assistant';
    content: string;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
    general: { label: 'Общая информация', icon: Settings, color: 'text-blue-600' },
    services: { label: 'Услуги и цены', icon: Briefcase, color: 'text-emerald-600' },
    faq: { label: 'Частые вопросы', icon: HelpCircle, color: 'text-violet-600' },
};

export default function BotSettingsPage() {
    const [configs, setConfigs] = useState<BotConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Test chat
    const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
    const [testInput, setTestInput] = useState('');
    const [testing, setTesting] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/bot/config')
            .then(r => r.json())
            .then(data => {
                setConfigs(Array.isArray(data) ? data : []);
                // expand all categories by default
                const exp: Record<string, boolean> = {};
                for (const c of Object.keys(CATEGORY_META)) exp[c] = true;
                setExpanded(exp);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSave = async (key: string, value: string) => {
        setSaving(key);
        await fetch('/api/bot/config', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
        });
        setSaving(null);
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
    };

    const handleTest = async () => {
        if (!testInput.trim() || testing) return;
        const userMsg = testInput.trim();
        setTestInput('');
        const newHistory = [...chatHistory, { role: 'user' as const, content: userMsg }];
        setChatHistory(newHistory);
        setTesting(true);
        try {
            const res = await fetch('/api/bot/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, history: chatHistory }),
            });
            const data = await res.json();
            setChatHistory([...newHistory, { role: 'assistant', content: data.reply || 'Ошибка' }]);
        } finally {
            setTesting(false);
        }
    };

    const byCategory = (cat: string) => configs.filter(c => c.category === cat);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Back */}
                <div className="mb-6">
                    <Link href="/optic/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> На дашборд
                    </Link>
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
                        <Bot className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Обучение WhatsApp-бота</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Заполни информацию о клинике — бот будет общаться на её основе</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-xl">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Бот активен
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Left: Config fields */}
                    <div className="space-y-4">
                        {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                            const Icon = meta.icon;
                            const fields = byCategory(cat);
                            if (!fields.length) return null;
                            return (
                                <div key={cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => setExpanded(e => ({ ...e, [cat]: !e[cat] }))}
                                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon className={`w-5 h-5 ${meta.color}`} />
                                            <span className="font-semibold text-gray-900">{meta.label}</span>
                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{fields.length}</span>
                                        </div>
                                        {expanded[cat] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </button>

                                    {expanded[cat] && (
                                        <div className="border-t border-gray-100 divide-y divide-gray-50">
                                            {fields.map(cfg => (
                                                <ConfigField
                                                    key={cfg.key}
                                                    config={cfg}
                                                    saving={saving === cfg.key}
                                                    saved={saved === cfg.key}
                                                    onSave={handleSave}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: Test chat */}
                    <div className="xl:sticky xl:top-6 xl:self-start">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Chat header */}
                            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-green-500 to-emerald-600">
                                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">Тестирование бота</p>
                                    <p className="text-green-100 text-xs">Попробуй написать как пациент</p>
                                </div>
                                <button
                                    onClick={() => setChatHistory([])}
                                    className="ml-auto p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                                    title="Сбросить чат"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="h-[420px] overflow-y-auto p-4 space-y-3 bg-gray-50">
                                {chatHistory.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <Sparkles className="w-10 h-10 text-gray-300 mb-3" />
                                        <p className="text-gray-400 text-sm">Напиши сообщение — бот ответит</p>
                                        <div className="mt-4 space-y-2">
                                            {['Здравствуйте, хочу записаться', 'Сколько стоят орто-К линзы?', 'Есть ли у вас детский врач?'].map(q => (
                                                <button
                                                    key={q}
                                                    onClick={() => { setTestInput(q); }}
                                                    className="block w-full text-left text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-600 hover:border-green-300 hover:text-green-700 transition-colors"
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {chatHistory.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                                                <Bot className="w-4 h-4 text-emerald-600" />
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                                            msg.role === 'user'
                                                ? 'bg-green-500 text-white rounded-br-sm'
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                                        }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {testing && (
                                    <div className="flex justify-start">
                                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center mr-2">
                                            <Bot className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            <div className="border-t border-gray-100 p-3 bg-white">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={testInput}
                                        onChange={e => setTestInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleTest()}
                                        placeholder="Напишите как пациент..."
                                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400"
                                    />
                                    <button
                                        onClick={handleTest}
                                        disabled={!testInput.trim() || testing}
                                        className="w-9 h-9 flex items-center justify-center bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white rounded-xl transition-colors"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-center">
                                    💡 Тест использует текущие сохранённые настройки
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConfigField({
    config, saving, saved, onSave
}: {
    config: BotConfig;
    saving: boolean;
    saved: boolean;
    onSave: (key: string, value: string) => void;
}) {
    const [value, setValue] = useState(config.value);
    const isMultiline = config.value.includes('\n') || config.value.length > 100 ||
        ['services', 'prices', 'faq', 'ortho_k_info', 'extra_rules'].includes(config.key);
    const isDirty = value !== config.value;

    return (
        <div className="px-5 py-4">
            <label className="block text-xs font-semibold text-gray-500 mb-2">{config.label}</label>
            {isMultiline ? (
                <textarea
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    rows={config.key === 'faq' ? 8 : 4}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-y text-gray-800 leading-relaxed"
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-gray-800"
                />
            )}
            <div className="flex justify-end mt-2">
                <button
                    onClick={() => onSave(config.key, value)}
                    disabled={saving || (!isDirty && !saved)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                        saved
                            ? 'bg-green-50 text-green-600 border border-green-200'
                            : isDirty
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> :
                     saved ? <CheckCircle className="w-3 h-3" /> :
                     <Save className="w-3 h-3" />}
                    {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить'}
                </button>
            </div>
        </div>
    );
}
