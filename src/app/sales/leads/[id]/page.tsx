'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Phone, MapPin, Clock, Send, Calendar, User,
    MessageCircle, Activity, Tag, Building2, AlertCircle, Check,
    Bell, CheckCircle, Building, PartyPopper, XCircle, BarChart2, FileText, Pin, MessageSquare
} from 'lucide-react';

// Types
interface LeadDetail {
    id: string;
    phone: string;
    name: string | null;
    city: string | null;
    source: string;
    stage: string;
    notes: string | null;
    tags: string[];
    appointmentAt: string | null;
    appointmentNotes: string | null;
    lostReason: string | null;
    revenue: number | null;
    createdAt: string;
    updatedAt: string;
    assignee: { id: string; fullName: string; avatar: string | null; email: string } | null;
    clinic: { id: string; name: string; phone: string | null; city: string | null } | null;
    order: { id: string; orderNumber: string; status: string; totalPrice: number } | null;
    messages: Array<{
        id: string;
        channel: string;
        direction: string;
        messageType: string;
        content: string;
        sentAt: string;
        sentBy: string | null;
        status: string | null;
    }>;
    reminders: Array<{
        id: string;
        type: string;
        message: string;
        scheduledAt: string;
        status: string;
    }>;
    activities: Array<{
        id: string;
        action: string;
        details: string | null;
        createdAt: string;
    }>;
}

const STAGE_MAP: Record<string, { label: string; icon: any; color: string }> = {
    new_lead: { label: 'Новый', icon: Bell, color: 'bg-blue-100 text-blue-700' },
    contacted: { label: 'Связались', icon: Phone, color: 'bg-indigo-100 text-indigo-700' },
    qualified: { label: 'Квалифицирован', icon: CheckCircle, color: 'bg-violet-100 text-violet-700' },
    appointment: { label: 'Записан', icon: Calendar, color: 'bg-emerald-100 text-emerald-700' },
    visited: { label: 'Пришёл', icon: Building, color: 'bg-teal-100 text-teal-700' },
    converted: { label: 'Конвертирован', icon: PartyPopper, color: 'bg-green-100 text-green-700' },
    lost: { label: 'Потерян', icon: XCircle, color: 'bg-red-100 text-red-700' },
};

const ACTIVITY_ICONS: Record<string, any> = {
    stage_change: BarChart2,
    note_added: FileText,
    message_sent: MessageSquare,
    appointment_booked: Calendar,
};

export default function LeadDetailPage() {
    const router = useRouter();
    const params = useParams();
    const leadId = params.id as string;

    const [lead, setLead] = useState<LeadDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'activity' | 'reminders'>('chat');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const fetchLead = useCallback(async () => {
        try {
            const res = await fetch(`/api/crm/leads/${leadId}`);
            if (!res.ok) throw new Error('Not found');
            const data = await res.json();
            setLead(data);
        } catch (err) {
            console.error('Failed to fetch lead:', err);
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => { fetchLead(); }, [fetchLead]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lead?.messages]);

    // Refresh messages every 5 seconds
    useEffect(() => {
        const interval = setInterval(fetchLead, 5000);
        return () => clearInterval(interval);
    }, [fetchLead]);

    const handleSendMessage = async () => {
        if (!messageText.trim() || sending) return;
        setSending(true);

        try {
            await fetch('/api/crm/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId,
                    content: messageText,
                }),
            });
            setMessageText('');
            fetchLead();
        } catch (err) {
            console.error('Failed to send:', err);
        } finally {
            setSending(false);
        }
    };

    const handleStageChange = async (newStage: string) => {
        try {
            await fetch(`/api/crm/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: newStage }),
            });
            fetchLead();
        } catch (err) {
            console.error('Failed to update stage:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-57px)]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Загрузка...</p>
                </div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-57px)]">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Лид не найден</p>
                    <button onClick={() => router.push('/sales/pipeline')} className="mt-2 text-sm text-blue-600 hover:underline">
                        ← Вернуться к воронке
                    </button>
                </div>
            </div>
        );
    }

    const stageInfo = STAGE_MAP[lead.stage] || STAGE_MAP.new_lead;

    return (
        <div className="h-[calc(100vh-57px)] flex">
            {/* Left Panel — Lead Info */}
            <div className="w-80 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                    <button onClick={() => router.push('/sales/pipeline')} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
                        <ArrowLeft className="w-3 h-3" /> Воронка
                    </button>

                    <h2 className="text-lg font-bold text-gray-900">{lead.name || 'Без имени'}</h2>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {lead.phone.replace('@c.us', '')}
                    </p>
                    {lead.city && (
                        <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {lead.city}
                        </p>
                    )}
                </div>

                {/* Stage */}
                <div className="p-4 border-b border-gray-100">
                    <label className="text-xs text-gray-500 mb-2 block">Стадия</label>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${stageInfo.color}`}>
                        <stageInfo.icon className="w-4 h-4" /> {stageInfo.label}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                        {Object.entries(STAGE_MAP).map(([key, info]) => (
                            <button
                                key={key}
                                onClick={() => handleStageChange(key)}
                                disabled={key === lead.stage}
                                className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                                    key === lead.stage
                                        ? 'bg-gray-200 text-gray-500 cursor-default'
                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                }`}
                            >
                                <info.icon className="w-3 h-3 inline mr-1" /> {info.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Appointment */}
                {lead.appointmentAt && (
                    <div className="p-4 border-b border-gray-100">
                        <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Запись</label>
                        <p className="text-sm font-medium text-emerald-700">
                            {new Date(lead.appointmentAt).toLocaleDateString('ru-RU', {
                                weekday: 'long', day: 'numeric', month: 'long',
                            })}
                        </p>
                        <p className="text-sm text-emerald-600">
                            {new Date(lead.appointmentAt).toLocaleTimeString('ru-RU', {
                                hour: '2-digit', minute: '2-digit',
                            })}
                        </p>
                        {lead.appointmentNotes && (
                            <p className="text-xs text-gray-400 mt-1">{lead.appointmentNotes}</p>
                        )}
                    </div>
                )}

                {/* Assignee */}
                <div className="p-4 border-b border-gray-100">
                    <label className="text-xs text-gray-500 mb-1 block">Менеджер</label>
                    {lead.assignee ? (
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                {lead.assignee.fullName.charAt(0)}
                            </div>
                            <span className="text-sm text-gray-700">{lead.assignee.fullName}</span>
                        </div>
                    ) : (
                        <span className="text-sm text-gray-300">Не назначен</span>
                    )}
                </div>

                {/* Clinic */}
                <div className="p-4 border-b border-gray-100">
                    <label className="text-xs text-gray-500 mb-1 block">Клиника</label>
                    {lead.clinic ? (
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{lead.clinic.name}</span>
                        </div>
                    ) : (
                        <span className="text-sm text-gray-300">Не назначена</span>
                    )}
                </div>

                {/* Notes */}
                <div className="p-4 border-b border-gray-100">
                    <label className="text-xs text-gray-500 mb-1 block">Заметки</label>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {lead.notes || '—'}
                    </p>
                </div>

                {/* Meta */}
                <div className="p-4 text-xs text-gray-400 space-y-1">
                    <p>Источник: {lead.source}</p>
                    <p>Создан: {new Date(lead.createdAt).toLocaleString('ru-RU')}</p>
                    <p>Обновлён: {new Date(lead.updatedAt).toLocaleString('ru-RU')}</p>
                </div>
            </div>

            {/* Right Panel — Chat / Activity */}
            <div className="flex-1 flex flex-col bg-gray-50">
                {/* Tabs */}
                <div className="bg-white border-b border-gray-200 px-4">
                    <div className="flex gap-4">
                        {([
                            { key: 'chat', label: 'Чат', icon: MessageCircle, count: lead.messages.length },
                            { key: 'activity', label: 'Активность', icon: Activity, count: lead.activities.length },
                            { key: 'reminders', label: 'Напоминания', icon: Calendar, count: lead.reminders.length },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{tab.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                    <div className="flex-1 flex flex-col">
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {lead.messages.length === 0 ? (
                                <div className="text-center py-16 text-gray-300">
                                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Нет сообщений</p>
                                </div>
                            ) : (
                                lead.messages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                                            msg.direction === 'outgoing'
                                                ? 'bg-blue-600 text-white rounded-br-md'
                                                : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                                        }`}>
                                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                            <div className={`flex items-center justify-end gap-1 mt-1 ${
                                                msg.direction === 'outgoing' ? 'text-blue-200' : 'text-gray-400'
                                            }`}>
                                                <span className="text-[10px]">
                                                    {new Date(msg.sentAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {msg.direction === 'outgoing' && msg.status === 'read' && (
                                                    <Check className="w-3 h-3" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div className="border-t border-gray-200 bg-white p-4">
                            <div className="flex items-end gap-2">
                                <textarea
                                    value={messageText}
                                    onChange={e => setMessageText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Написать сообщение..."
                                    rows={1}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageText.trim() || sending}
                                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {sending ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                    <div className="flex-1 overflow-y-auto p-4">
                        {lead.activities.length === 0 ? (
                            <div className="text-center py-16 text-gray-300">
                                <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Нет активности</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {lead.activities.map(act => (
                                    <div key={act.id} className="flex items-start gap-3 bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                                        <span className="text-gray-400 shrink-0">
                                            {(() => {
                                                const Icon = ACTIVITY_ICONS[act.action] || Pin;
                                                return <Icon className="w-4 h-4" />;
                                            })()}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-gray-700">{act.details || act.action}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                {new Date(act.createdAt).toLocaleString('ru-RU')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Reminders Tab */}
                {activeTab === 'reminders' && (
                    <div className="flex-1 overflow-y-auto p-4">
                        {lead.reminders.length === 0 ? (
                            <div className="text-center py-16 text-gray-300">
                                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Нет напоминаний</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {lead.reminders.map(rem => (
                                    <div key={rem.id} className={`bg-white rounded-lg p-4 shadow-sm border ${
                                        rem.status === 'sent' ? 'border-green-200' : rem.status === 'failed' ? 'border-red-200' : 'border-gray-100'
                                    }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-gray-500">{rem.type}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                                rem.status === 'sent' ? 'bg-green-100 text-green-700'
                                                : rem.status === 'failed' ? 'bg-red-100 text-red-700'
                                                : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {rem.status === 'sent' ? <><CheckCircle className="w-3 h-3 inline mr-1" />Отправлено</> : rem.status === 'failed' ? <><XCircle className="w-3 h-3 inline mr-1" />Ошибка</> : <><Clock className="w-3 h-3 inline mr-1" />Ожидает</>}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700">{rem.message}</p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            Запланировано: {new Date(rem.scheduledAt).toLocaleString('ru-RU')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
