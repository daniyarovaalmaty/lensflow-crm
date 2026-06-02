'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
    ArrowLeft, Bot, Save, MessageSquare, Send, RefreshCw,
    Settings, HelpCircle, Briefcase, CheckCircle, Loader2,
    ChevronDown, ChevronUp, Sparkles, User, MessageCircle,
    Play, Pause, Zap, Clock, ShieldAlert, CheckCheck, Compass,
    Sparkle, Check, Edit, Plus, X
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

interface LeadMessage {
    id: string;
    direction: 'incoming' | 'outgoing';
    content: string;
    sentAt: string;
    status: string | null;
    sentBy: string | null;
}

interface Lead {
    id: string;
    name: string | null;
    phone: string;
    stage: string;
    updatedAt: string;
    messages: Array<{ content: string; sentAt: string; direction: string }>;
    _count?: { messages: number };
}

interface BotSession {
    phone: string;
    state: string;
    collectedName: string | null;
    bookedAt: string | null;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
    general: { label: 'Общая информация', icon: Settings, color: 'text-blue-600' },
    services: { label: 'Услуги и цены', icon: Briefcase, color: 'text-emerald-600' },
    faq: { label: 'Частые вопросы (FAQ)', icon: HelpCircle, color: 'text-violet-600' },
};

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function BotSettingsPage() {
    const { data: session } = useSession();
    
    // Tabs: 'settings' | 'inbox' | 'whatsapp'
    const [activeTab, setActiveTab] = useState<'settings' | 'inbox' | 'whatsapp'>('inbox');

    // Tab 1: Config states
    const [configs, setConfigs] = useState<BotConfig[]>([]);
    const [loadingConfigs, setLoadingConfigs] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Tab 1: Sandbox Sandbox states
    const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
    const [testInput, setTestInput] = useState('');
    const [testing, setTesting] = useState(false);
    const sandboxEndRef = useRef<HTMLDivElement>(null);

    // Tab 2: Inbox states
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<LeadMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [botState, setBotState] = useState<string>('greeting');
    const [togglingBot, setTogglingBot] = useState(false);
    const [manualText, setManualText] = useState('');
    const [sendingManual, setSendingManual] = useState(false);

    // Tab 3: WhatsApp settings states
    const [whatsappData, setWhatsappData] = useState<{ org: any; branches: any[] } | null>(null);
    const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
    const [editingWhatsappId, setEditingWhatsappId] = useState<string | null>(null);
    const [whatsappInput, setWhatsappInput] = useState('');
    const [savingWhatsapp, setSavingWhatsapp] = useState(false);
    
    // Polling refs & interval
    const inboxEndRef = useRef<HTMLDivElement>(null);
    const selectedLeadIdRef = useRef<string | null>(null);

    useEffect(() => {
        selectedLeadIdRef.current = selectedLeadId;
    }, [selectedLeadId]);

    // Fetch config
    const loadConfig = async () => {
        setLoadingConfigs(true);
        try {
            const res = await fetch('/api/bot/config');
            if (res.ok) {
                const data = await res.json();
                setConfigs(Array.isArray(data) ? data : []);
                const exp: Record<string, boolean> = {};
                for (const c of Object.keys(CATEGORY_META)) exp[c] = true;
                setExpanded(exp);
            }
        } finally {
            setLoadingConfigs(false);
        }
    };

    // Fetch leads for Inbox
    const loadLeads = useCallback(async (showIndicator = false) => {
        if (showIndicator) setLoadingLeads(true);
        try {
            const res = await fetch('/api/crm/leads?source=whatsapp&limit=100');
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
            }
        } finally {
            if (showIndicator) setLoadingLeads(false);
        }
    }, []);

    // Load active messages and active bot session
    const loadActiveChat = useCallback(async (leadId: string) => {
        setLoadingMessages(true);
        try {
            // Fetch messages
            const resMessages = await fetch(`/api/crm/messages?leadId=${leadId}`);
            if (resMessages.ok) {
                const messagesData = await resMessages.json();
                setMessages(messagesData);
            }

            // Fetch lead details to get phone
            const lead = leads.find(l => l.id === leadId);
            if (lead) {
                const resBot = await fetch(`/api/bot/session?phone=${lead.phone}`);
                if (resBot.ok) {
                    const botData = await resBot.json();
                    setBotState(botData.state || 'greeting');
                }
            }
        } finally {
            setLoadingMessages(false);
        }
    }, [leads]);

    // Fetch WhatsApp data
    const loadWhatsappData = useCallback(async () => {
        setLoadingWhatsapp(true);
        try {
            const res = await fetch('/api/crm/whatsapp');
            if (res.ok) {
                const data = await res.json();
                setWhatsappData(data);
            }
        } finally {
            setLoadingWhatsapp(false);
        }
    }, []);

    // Save WhatsApp number
    const handleSaveWhatsapp = async (targetOrgId: string) => {
        setSavingWhatsapp(true);
        try {
            const res = await fetch('/api/crm/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetOrgId, crmPhone: whatsappInput }),
            });
            if (res.ok) {
                setEditingWhatsappId(null);
                await loadWhatsappData();
            } else {
                const err = await res.json();
                alert(err.error || 'Ошибка сохранения');
            }
        } finally {
            setSavingWhatsapp(false);
        }
    };

    // Initial loading
    useEffect(() => {
        loadConfig();
        loadLeads(true);
        loadWhatsappData();
    }, [loadLeads, loadWhatsappData]);

    // Poll messages & leads in Inbox tab
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTab === 'inbox') {
                loadLeads(false);
                if (selectedLeadIdRef.current) {
                    // Silent refresh of active messages
                    fetch(`/api/crm/messages?leadId=${selectedLeadIdRef.current}`)
                        .then(res => res.json())
                        .then(data => {
                            if (Array.isArray(data)) {
                                setMessages(data);
                            }
                        })
                        .catch(err => console.error('Poll failed:', err));
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [activeTab]);

    // Scroll handlers
    useEffect(() => {
        sandboxEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    useEffect(() => {
        inboxEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Save Bot Config
    const handleSaveConfig = async (key: string, value: string) => {
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

    // Test chat in sandbox
    const handleTestSandbox = async () => {
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

    // Toggle Bot Session state (paused vs active)
    const handleToggleBot = async (phone: string, currentState: string) => {
        if (togglingBot) return;
        setTogglingBot(true);
        const newState = currentState === 'paused' ? 'greeting' : 'paused';
        try {
            const res = await fetch('/api/bot/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, state: newState }),
            });
            if (res.ok) {
                const sessionData = await res.json();
                setBotState(sessionData.state);
            }
        } finally {
            setTogglingBot(false);
        }
    };

    // Send manual message in chat center
    const handleSendManual = async () => {
        if (!manualText.trim() || sendingManual || !selectedLeadId) return;
        const text = manualText.trim();
        setManualText('');
        setSendingManual(true);
        try {
            const res = await fetch('/api/crm/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId: selectedLeadId,
                    content: text,
                    userId: session?.user?.id
                }),
            });
            if (res.ok) {
                const message = await res.json();
                setMessages(prev => [...prev, message]);
                setBotState('paused'); // Auto-paused by server when manual answer is sent!
            }
        } finally {
            setSendingManual(false);
        }
    };

    const byCategory = (cat: string) => configs.filter(c => c.category === cat);

    const activeLead = leads.find(l => l.id === selectedLeadId) || null;

    return (
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-6 pb-20">
            {/* Header banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 border border-white/5">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-xs font-bold text-emerald-300 mb-3 tracking-wide uppercase">
                            <Bot className="w-3.5 h-3.5" /> WhatsApp AI-Ассистент
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Диалоги и управление ботом</h1>
                        <p className="text-emerald-100 text-sm max-w-xl leading-relaxed">
                            Умный GPT-ассистент общается с пациентами по ночным линзам, отвечает на вопросы, записывает на приём и вносит лиды в CRM.
                        </p>
                    </div>
                    <div className="flex gap-2.5 shrink-0 bg-white/5 border border-white/10 p-1.5 rounded-2xl">
                        <button 
                            onClick={() => setActiveTab('inbox')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'inbox' 
                                    ? 'bg-emerald-500 text-white shadow-md' 
                                    : 'text-emerald-100 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <MessageSquare className="w-4 h-4" /> Чат-центр (Inbox)
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'settings' 
                                    ? 'bg-emerald-500 text-white shadow-md' 
                                    : 'text-emerald-100 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Settings className="w-4 h-4" /> Обучение & Sandbox
                        </button>
                        <button 
                            onClick={() => setActiveTab('whatsapp')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'whatsapp' 
                                    ? 'bg-emerald-500 text-white shadow-md' 
                                    : 'text-emerald-100 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <MessageCircle className="w-4 h-4" /> WhatsApp CRM
                        </button>
                    </div>
                </div>
            </div>

            {/* TAB 1: AI TRAINING & SANDBOX */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fadeIn">
                    {/* Left: Config fields */}
                    {loadingConfigs ? (
                        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center flex items-center justify-center min-h-[500px]">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                                const Icon = meta.icon;
                                const fields = byCategory(cat);
                                if (!fields.length) return null;
                                return (
                                    <div key={cat} className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-sm">
                                        <button
                                            onClick={() => setExpanded(e => ({ ...e, [cat]: !e[cat] }))}
                                            className="w-full flex items-center justify-between px-6 py-4.5 hover:bg-gray-50/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`p-2 rounded-xl bg-gray-50 border border-gray-100 ${meta.color}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm">{meta.label}</span>
                                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">{fields.length}</span>
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
                                                        onSave={handleSaveConfig}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Right: Sandbox chat */}
                    <div className="xl:sticky xl:top-24 xl:self-start">
                        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
                            {/* Chat header */}
                            <div className="flex items-center gap-3 px-6 py-4.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
                                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Песочница ассистента</p>
                                    <p className="text-emerald-100 text-[10px]">Интерактивная проверка ответов бота</p>
                                </div>
                                <button
                                    onClick={() => setChatHistory([])}
                                    className="ml-auto p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                                    title="Сбросить чат"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="h-[430px] overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                                {chatHistory.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                        <Sparkles className="w-10 h-10 text-emerald-300 mb-3 animate-pulse" />
                                        <h4 className="text-sm font-bold text-gray-800 mb-1">Песочница бота</h4>
                                        <p className="text-xs text-gray-400 max-w-xs mb-6">
                                            Протестируйте AI-ассистента перед запуском. Напишите ему сообщение как пациент, интересующийся ночными линзами.
                                        </p>
                                        <div className="w-full space-y-2">
                                            {[
                                                'Здравствуйте, сколько стоят ночные линзы?',
                                                'Как записаться к Айгерим Аскаровой?',
                                                'Со скольки лет ребенку можно орто-К линзы?'
                                            ].map(q => (
                                                <button
                                                    key={q}
                                                    onClick={() => setTestInput(q)}
                                                    className="w-full text-left text-xs bg-white border border-gray-100 rounded-xl px-4 py-3 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors shadow-sm"
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
                                            <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                                                <Bot className="w-4 h-4 text-emerald-600" />
                                            </div>
                                        )}
                                        <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs whitespace-pre-wrap ${
                                            msg.role === 'user'
                                                ? 'bg-emerald-600 text-white rounded-br-sm shadow-sm'
                                                : 'bg-white border border-gray-200/80 text-gray-800 rounded-bl-sm shadow-sm leading-relaxed'
                                        }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {testing && (
                                    <div className="flex justify-start">
                                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center mr-2 flex-shrink-0">
                                            <Bot className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                            <div className="flex gap-1.5">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={sandboxEndRef} />
                            </div>

                            {/* Input */}
                            <div className="border-t border-gray-100 p-3 bg-white">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={testInput}
                                        onChange={e => setTestInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleTestSandbox()}
                                        placeholder="Задайте вопрос как пациент..."
                                        className="flex-1 px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                                    />
                                    <button
                                        onClick={handleTestSandbox}
                                        disabled={!testInput.trim() || testing}
                                        className="w-10 h-10 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl transition-colors shadow-sm"
                                    >
                                        <Send className="w-4.5 h-4.5" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 text-center">
                                    💡 Sandbox-чат использует последние сохранённые параметры для сборки промпта
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: INBOX & LIVE CHATS */}
            {activeTab === 'inbox' && (
                <div className="bg-white border border-gray-200/80 rounded-3xl shadow-sm overflow-hidden flex flex-col lg:flex-row h-[700px] animate-fadeIn">
                    
                    {/* Left: Chats list */}
                    <div className="w-full lg:w-[380px] border-r border-gray-100 flex flex-col h-full bg-slate-50/15">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                                    <MessageCircle className="w-4.5 h-4.5 text-emerald-500" /> Активные диалоги
                                </h3>
                                <p className="text-[10px] text-gray-400 mt-0.5">Входящие лиды из WhatsApp</p>
                            </div>
                            <button 
                                onClick={() => loadLeads(true)}
                                className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-emerald-500 transition-colors"
                                title="Обновить"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 p-2 space-y-1">
                            {loadingLeads && leads.length === 0 ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                                </div>
                            ) : leads.length === 0 ? (
                                <div className="text-center py-12 p-4">
                                    <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-xs text-gray-400 font-medium">Нет активных диалогов</p>
                                </div>
                            ) : (
                                leads.map(lead => {
                                    const isSelected = selectedLeadId === lead.id;
                                    const lastMsg = lead.messages?.[0];
                                    const dateStr = lastMsg ? new Date(lastMsg.sentAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
                                    
                                    return (
                                        <button
                                            key={lead.id}
                                            onClick={() => { setSelectedLeadId(lead.id); loadActiveChat(lead.id); }}
                                            className={`w-full text-left p-3.5 rounded-2xl flex flex-col gap-1 transition-all ${
                                                isSelected 
                                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 font-bold' 
                                                    : 'hover:bg-gray-50 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-800 truncate max-w-[190px]">
                                                    {lead.name || `Пациент ${lead.phone.slice(-4)}`}
                                                </span>
                                                <span className="text-[9px] text-gray-400 font-medium">{dateStr}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] text-gray-500 truncate max-w-[200px]">
                                                    {lastMsg ? lastMsg.content : 'Нет сообщений'}
                                                </span>
                                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.5 rounded">
                                                    {lead.stage === 'appointment' ? 'Запись' : 'Лид'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Active Chat area */}
                    <div className="flex-1 flex flex-col h-full bg-white relative">
                        {activeLead ? (
                            <>
                                {/* Active Chat Toolbar */}
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">
                                            {activeLead.name || `Пациент ${activeLead.phone.slice(-4)}`}
                                        </h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5">+{activeLead.phone}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Status pill */}
                                        <div className="flex items-center gap-2">
                                            {botState === 'paused' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/50 text-[10px] font-bold text-amber-700">
                                                    <User className="w-3.5 h-3.5" /> Ручной режим
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/50 text-[10px] font-bold text-emerald-700">
                                                    <Bot className="w-3.5 h-3.5" /> AI Бот активен
                                                </span>
                                            )}
                                        </div>

                                        {/* Dynamic Toggle Switch */}
                                        <button
                                            onClick={() => handleToggleBot(activeLead.phone, botState)}
                                            disabled={togglingBot}
                                            className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                botState !== 'paused' ? 'bg-emerald-500' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    botState !== 'paused' ? 'translate-x-5.5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Active Chat Messages container */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/40">
                                    {loadingMessages && messages.length === 0 ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                        </div>
                                    ) : (
                                        messages.map(msg => {
                                            const isIncoming = msg.direction === 'incoming';
                                            const isAI = !isIncoming && msg.sentBy === null; // Outgoing from Bot
                                            
                                            return (
                                                <div key={msg.id} className={`flex ${isIncoming ? 'justify-start' : 'justify-end'}`}>
                                                    {isIncoming ? (
                                                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center mr-2 mt-0.5 border border-gray-200 shrink-0">
                                                            <User className="w-3.5 h-3.5 text-gray-500" />
                                                        </div>
                                                    ) : isAI ? (
                                                        <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mr-2 mt-0.5 shrink-0 order-first">
                                                            <Bot className="w-3.5 h-3.5 text-emerald-600" />
                                                        </div>
                                                    ) : null}
                                                    
                                                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                                                        isIncoming 
                                                            ? 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm' 
                                                            : isAI 
                                                                ? 'bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-br-sm'
                                                                : 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                                                    }`}>
                                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-60">
                                                            <span>{new Date(msg.sentAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            {!isIncoming && (
                                                                msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <CheckCircle className="w-3 h-3 text-gray-300" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={inboxEndRef} />
                                </div>

                                {/* Active Chat Manual Send box */}
                                <div className="p-3 border-t border-gray-100 bg-white shrink-0">
                                    <div className="flex gap-2">
                                        <textarea
                                            value={manualText}
                                            onChange={e => setManualText(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendManual();
                                                }
                                            }}
                                            placeholder="Введите сообщение пациенту... (AI-бот автоматически отключится при вашем ответе)"
                                            rows={2}
                                            className="flex-1 px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 resize-none leading-relaxed"
                                        />
                                        <button
                                            onClick={handleSendManual}
                                            disabled={!manualText.trim() || sendingManual}
                                            className="w-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-sm"
                                            title="Отправить вручную"
                                        >
                                            {sendingManual ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-400 mt-2 text-center">
                                        💡 Ваше ручное сообщение мгновенно улетит в WhatsApp пациента, а статус ИИ-помощника автоматически переключится в «Ручной режим».
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50/10">
                                <MessageCircle className="w-12 h-12 text-gray-300 mb-3 animate-pulse" />
                                <h4 className="text-sm font-bold text-gray-800 mb-1">Выберите диалог</h4>
                                <p className="text-xs text-gray-400 max-w-xs">
                                    Выберите пациента из левого списка, чтобы открыть переписку и управлять статусом его AI-помощника.
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* TAB 3: WHATSAPP INTEGRATION & SETTINGS */}
            {activeTab === 'whatsapp' && (
                <div className="max-w-4xl mx-auto animate-fadeIn space-y-6">
                    {/* Intro card */}
                    <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                                <MessageCircle className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Настройка WhatsApp CRM</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Укажите номера WhatsApp для интеграции с Green-API. Входящие сообщения на эти номера будут мгновенно попадать в Чат-центр CRM, а наш ИИ-ассистент будет автоматически консультировать пациентов согласно сценариям.
                                </p>
                            </div>
                        </div>
                    </div>

                    {loadingWhatsapp ? (
                        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center flex items-center justify-center min-h-[300px]">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                        </div>
                    ) : whatsappData ? (
                        <div className="space-y-6">
                            {/* Headquarters / Standalone CRM WhatsApp */}
                            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
                                <div className="px-6 py-4.5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                        <span className="font-bold text-gray-900 text-sm">Основная клиника (Сеть)</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                        {whatsappData.org.type === 'standalone' ? 'Одиночная клиника' : 'Головной офис'}
                                    </span>
                                </div>
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{whatsappData.org.name}</h4>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Главный номер WhatsApp для приёма лидов и авторизации через OTP.
                                            </p>
                                        </div>
                                        <div className="shrink-0">
                                            {editingWhatsappId === whatsappData.org.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        value={whatsappInput}
                                                        onChange={e => setWhatsappInput(e.target.value)}
                                                        placeholder="+7 700 111 22 33"
                                                        className="px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none w-52"
                                                        autoFocus
                                                    />
                                                    <button 
                                                        onClick={() => handleSaveWhatsapp(whatsappData.org.id)}
                                                        disabled={savingWhatsapp}
                                                        className="p-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors disabled:opacity-50"
                                                    >
                                                        {savingWhatsapp ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Check className="w-4.5 h-4.5" />}
                                                    </button>
                                                    <button 
                                                        onClick={() => setEditingWhatsappId(null)}
                                                        className="p-2 text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : whatsappData.org.crmPhone ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                                                        <MessageCircle className="w-4.5 h-4.5 text-emerald-500" /> {whatsappData.org.crmPhone}
                                                    </span>
                                                    <button
                                                        onClick={() => { setWhatsappInput(whatsappData.org.crmPhone || ''); setEditingWhatsappId(whatsappData.org.id); }}
                                                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                                        title="Изменить"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setWhatsappInput(''); setEditingWhatsappId(whatsappData.org.id); }}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                                >
                                                    <Plus className="w-4.5 h-4.5" /> Подключить WhatsApp
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Branches CRM WhatsApp */}
                            {whatsappData.org.type !== 'standalone' && (
                                <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4.5 bg-gray-50/50 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                                            <span className="font-bold text-gray-900 text-sm">Филиалы клиники</span>
                                        </div>
                                    </div>
                                    {whatsappData.branches.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <p className="text-sm text-gray-400">Филиалы не добавлены.</p>
                                            <p className="text-xs text-gray-400 mt-1">Добавьте филиалы в разделе «Филиалы» на панели управления.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {whatsappData.branches.map(branch => (
                                                <div key={branch.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 text-sm">{branch.name}</h4>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {branch.city || 'Город не указан'}{branch.address ? ` • ${branch.address}` : ''}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0">
                                                        {editingWhatsappId === branch.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    value={whatsappInput}
                                                                    onChange={e => setWhatsappInput(e.target.value)}
                                                                    placeholder="+7 700 111 22 33"
                                                                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none w-52"
                                                                    autoFocus
                                                                />
                                                                <button 
                                                                    onClick={() => handleSaveWhatsapp(branch.id)}
                                                                    disabled={savingWhatsapp}
                                                                    className="p-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors disabled:opacity-50"
                                                                >
                                                                    {savingWhatsapp ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Check className="w-4.5 h-4.5" />}
                                                                </button>
                                                                <button 
                                                                    onClick={() => setEditingWhatsappId(null)}
                                                                    className="p-2 text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : branch.crmPhone ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                                                                    <MessageCircle className="w-4.5 h-4.5 text-emerald-500" /> {branch.crmPhone}
                                                                </span>
                                                                <button
                                                                    onClick={() => { setWhatsappInput(branch.crmPhone || ''); setEditingWhatsappId(branch.id); }}
                                                                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                                                    title="Изменить"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => { setWhatsappInput(''); setEditingWhatsappId(branch.id); }}
                                                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                                                            >
                                                                <Plus className="w-4.5 h-4.5" /> Подключить WhatsApp
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center">
                            <p className="text-sm text-gray-500">Не удалось загрузить данные WhatsApp.</p>
                        </div>
                    )}
                </div>
            )}
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
        <div className="px-6 py-5">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{config.label}</label>
            {isMultiline ? (
                <textarea
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    rows={config.key === 'faq' ? 8 : 4}
                    className="w-full text-xs border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 resize-y text-gray-800 leading-relaxed shadow-sm bg-slate-50/10"
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 text-gray-800 shadow-sm bg-slate-50/10"
                />
            )}
            <div className="flex justify-end mt-3">
                <button
                    onClick={() => onSave(config.key, value)}
                    disabled={saving || (!isDirty && !saved)}
                    className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-bold transition-all shadow-sm ${
                        saved
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : isDirty
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    }`}
                >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                     saved ? <CheckCircle className="w-3.5 h-3.5" /> :
                     <Save className="w-3.5 h-3.5" />}
                    {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить'}
                </button>
            </div>
        </div>
    );
}
