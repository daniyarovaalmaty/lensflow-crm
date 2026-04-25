'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone, MapPin, Plus, Search, X, MessageCircle,
    GripVertical, Calendar, User, Target, TrendingUp,
    UserPlus, Clock, Instagram, MessageSquare
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface LeadCard {
    id: string;
    phone: string;
    name: string | null;
    city: string | null;
    source: string;
    stage: string;
    assignee: { id: string; fullName: string; avatar: string | null } | null;
    clinic: { id: string; name: string } | null;
    messages: Array<{ content: string; sentAt: string; direction: string }>;
    _count: { messages: number };
    appointmentAt: string | null;
    createdAt: string;
    updatedAt: string;
}

const STAGES = [
    { key: 'new_lead', label: 'Новые', icon: UserPlus, color: 'bg-blue-100 text-blue-700' },
    { key: 'contacted', label: 'Связались', icon: Phone, color: 'bg-indigo-100 text-indigo-700' },
    { key: 'qualified', label: 'Квалифицирован', icon: Target, color: 'bg-violet-100 text-violet-700' },
    { key: 'appointment', label: 'Записан', icon: Calendar, color: 'bg-emerald-100 text-emerald-700' },
    { key: 'visited', label: 'Пришёл', icon: User, color: 'bg-teal-100 text-teal-700' },
    { key: 'converted', label: 'Конвертирован', icon: TrendingUp, color: 'bg-green-100 text-green-700' },
    { key: 'lost', label: 'Потерян', icon: X, color: 'bg-red-100 text-red-700' },
];

const SOURCE_ICONS: Record<string, any> = {
    whatsapp: MessageSquare,
    instagram: Instagram,
    manual: UserPlus,
    website: Target,
    referral: User,
};

function timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'только что';
    if (mins < 60) return `${mins} мин`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч`;
    const days = Math.floor(hours / 24);
    return `${days} д`;
}

export default function SalesPipelinePage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [leads, setLeads] = useState<LeadCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [draggedLead, setDraggedLead] = useState<string | null>(null);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);
    const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    const fetchLeads = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            params.set('limit', '200');
            const res = await fetch(`/api/crm/leads?${params}`);
            const data = await res.json();
            setLeads(data.leads || []);
            setStageCounts(data.stagesCounts || {});
        } catch (err) {
            console.error('Failed to fetch leads:', err);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);
    useEffect(() => {
        const interval = setInterval(fetchLeads, 15000);
        return () => clearInterval(interval);
    }, [fetchLeads]);

    const groupedLeads = useMemo(() =>
        STAGES.map(stage => ({
            ...stage,
            leads: leads.filter(l => l.stage === stage.key),
        })),
        [leads]
    );

    const activeLeads = leads.filter(l => !['converted', 'lost'].includes(l.stage)).length;
    const convertedCount = stageCounts['converted'] || 0;

    const selectedLead = useMemo(() =>
        leads.find(l => l.id === selectedLeadId) || null,
        [leads, selectedLeadId]
    );

    // ── Drag & Drop ──
    const handleDragStart = (leadId: string) => setDraggedLead(leadId);
    const handleDragOver = (e: React.DragEvent, stageKey: string) => {
        e.preventDefault();
        setDragOverStage(stageKey);
    };
    const handleDrop = async (stageKey: string) => {
        if (!draggedLead) return;
        const lead = leads.find(l => l.id === draggedLead);
        if (!lead || lead.stage === stageKey) {
            setDraggedLead(null); setDragOverStage(null); return;
        }
        setLeads(prev => prev.map(l => l.id === draggedLead ? { ...l, stage: stageKey } : l));
        try {
            await fetch(`/api/crm/leads/${draggedLead}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: stageKey }),
            });
        } catch { fetchLeads(); }
        setDraggedLead(null); setDragOverStage(null);
    };

    // ── Add lead ──
    const [newPhone, setNewPhone] = useState('');
    const [newName, setNewName] = useState('');
    const [newCity, setNewCity] = useState('');
    const [addingLead, setAddingLead] = useState(false);

    const handleAddLead = async () => {
        if (!newPhone || addingLead) return;
        setAddingLead(true);
        try {
            await fetch('/api/crm/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: newPhone, name: newName || null, city: newCity || null, source: 'manual' }),
            });
            setNewPhone(''); setNewName(''); setNewCity('');
            setShowAddModal(false);
            fetchLeads();
        } catch (err) {
            console.error('Failed to add lead:', err);
        } finally {
            setAddingLead(false);
        }
    };

    // Lock body scroll for modals
    useEffect(() => {
        if (selectedLeadId || showAddModal) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [selectedLeadId, showAddModal]);

    // ── Lead Card (matches OrderCard style) ──
    const LeadCard = ({ lead }: { lead: LeadCard }) => {
        const SourceIcon = SOURCE_ICONS[lead.source] || Target;
        return (
            <div
                draggable
                onDragStart={() => handleDragStart(lead.id)}
                onClick={() => setSelectedLeadId(lead.id)}
                className={`card cursor-pointer hover:shadow-md transition-all group hover:border-blue-200 ${
                    draggedLead === lead.id ? 'opacity-50 scale-95' : ''
                }`}
            >
                <div className="space-y-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                                {lead.name || 'Без имени'}
                            </h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {lead.phone.replace('@c.us', '')}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-gray-400">{timeAgo(lead.updatedAt)}</span>
                            <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab" />
                        </div>
                    </div>

                    {lead.city && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" /> {lead.city}
                        </div>
                    )}

                    {lead.appointmentAt && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 rounded px-2 py-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(lead.appointmentAt).toLocaleDateString('ru-RU', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                        </div>
                    )}

                    {lead.messages?.[0] && (
                        <div className="text-xs text-gray-400 bg-gray-50 rounded px-2 py-1 truncate">
                            {lead.messages[0].direction === 'incoming' ? '← ' : '→ '}
                            {lead.messages[0].content.substring(0, 60)}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <SourceIcon className="w-3 h-3" />
                            {lead.source}
                        </div>
                        {lead._count.messages > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                <MessageCircle className="w-3 h-3" />
                                {lead._count.messages}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ── Column (matches production hub Column style) ──
    const Column = ({ stage }: { stage: typeof groupedLeads[0] }) => {
        const Icon = stage.icon;
        return (
            <div
                className="flex-shrink-0 w-[75vw] sm:w-auto sm:flex-1 min-w-0 sm:min-w-[240px]"
                onDragOver={e => handleDragOver(e, stage.key)}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => handleDrop(stage.key)}
            >
                <div className={`card mb-4 ${stage.color} ${dragOverStage === stage.key ? 'ring-2 ring-blue-400' : ''}`}>
                    <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <h3 className="font-semibold">{stage.label}</h3>
                        <span className="ml-auto bg-white/50 rounded-full px-2 py-0.5 text-sm font-medium">
                            {stage.leads.length}
                        </span>
                    </div>
                </div>
                <div className="space-y-3">
                    {stage.leads.length === 0 ? (
                        <div className="card text-center py-8 text-gray-400">
                            <p className="text-sm">Нет лидов</p>
                        </div>
                    ) : (
                        stage.leads.map(lead => <LeadCard key={lead.id} lead={lead} />)
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Загрузка воронки...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header — same style as production hub */}
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Target className="w-6 h-6 text-blue-600" /> Воронка продаж
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {activeLeads} активных · {convertedCount} конвертировано
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative hidden sm:block">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Поиск по имени, телефону..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-64"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-primary gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Добавить лид
                        </button>
                    </div>
                </div>

                {/* Kanban Board — horizontal scroll like production hub */}
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none -mx-4 px-4 sm:mx-0 sm:px-0">
                    {groupedLeads.map(stage => (
                        <Column key={stage.key} stage={stage} />
                    ))}
                </div>
            </div>

            {/* Lead Detail Modal — same style as OrderModal */}
            <AnimatePresence>
                {selectedLead && (
                    <div
                        className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-[2vh] sm:pt-[5vh] overflow-y-auto"
                        onClick={() => setSelectedLeadId(null)}
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mb-[5vh] overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">{selectedLead.name || 'Без имени'}</h2>
                                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                                            <Phone className="w-3 h-3" />
                                            {selectedLead.phone.replace('@c.us', '')}
                                            {selectedLead.city && (
                                                <>
                                                    <span className="text-gray-300">·</span>
                                                    <MapPin className="w-3 h-3" />
                                                    {selectedLead.city}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedLeadId(null)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="px-6 py-4 space-y-4">
                                {/* Stage selector */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-2 block">Стадия</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {STAGES.map(s => {
                                            const Icon = s.icon;
                                            const isActive = selectedLead.stage === s.key;
                                            return (
                                                <button
                                                    key={s.key}
                                                    onClick={async () => {
                                                        if (isActive) return;
                                                        setLeads(prev => prev.map(l =>
                                                            l.id === selectedLead.id ? { ...l, stage: s.key } : l
                                                        ));
                                                        await fetch(`/api/crm/leads/${selectedLead.id}`, {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ stage: s.key }),
                                                        });
                                                    }}
                                                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                                                        isActive ? s.color + ' font-semibold' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    <Icon className="w-3 h-3" />
                                                    {s.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Appointment */}
                                {selectedLead.appointmentAt && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                        <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
                                            <Calendar className="w-4 h-4" />
                                            Запись: {new Date(selectedLead.appointmentAt).toLocaleDateString('ru-RU', {
                                                weekday: 'long', day: 'numeric', month: 'long',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Info */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <span className="text-xs text-gray-500 block mb-1">Источник</span>
                                        <span className="font-medium text-gray-800">{selectedLead.source}</span>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <span className="text-xs text-gray-500 block mb-1">Сообщений</span>
                                        <span className="font-medium text-gray-800">{selectedLead._count.messages}</span>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <span className="text-xs text-gray-500 block mb-1">Создан</span>
                                        <span className="font-medium text-gray-800 text-xs">{new Date(selectedLead.createdAt).toLocaleString('ru-RU')}</span>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <span className="text-xs text-gray-500 block mb-1">Обновлён</span>
                                        <span className="font-medium text-gray-800 text-xs">{timeAgo(selectedLead.updatedAt)}</span>
                                    </div>
                                </div>

                                {/* Last messages preview */}
                                {selectedLead.messages.length > 0 && (
                                    <div>
                                        <label className="text-xs text-gray-500 mb-2 block">Последние сообщения</label>
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                            {selectedLead.messages.slice(0, 5).map((msg, i) => (
                                                <div key={i} className={`text-xs px-3 py-1.5 rounded-lg ${
                                                    msg.direction === 'outgoing' ? 'bg-blue-50 text-blue-700 ml-4' : 'bg-gray-50 text-gray-600 mr-4'
                                                }`}>
                                                    {msg.content.substring(0, 100)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-gray-100 px-6 py-4 flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedLeadId(null);
                                        router.push(`/sales/leads/${selectedLead.id}`);
                                    }}
                                    className="btn btn-primary flex-1 justify-center gap-2"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Открыть чат
                                </button>
                                <button
                                    onClick={() => setSelectedLeadId(null)}
                                    className="btn bg-gray-100 text-gray-600 hover:bg-gray-200 px-4"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Lead Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]" onClick={() => setShowAddModal(false)}>
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full"
                        >
                            <div className="px-6 py-4 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <Plus className="w-5 h-5 text-blue-600" /> Новый лид
                                    </h2>
                                    <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="px-6 py-4 space-y-3">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Телефон *</label>
                                    <input type="tel" placeholder="+7 700 123 4567" value={newPhone}
                                        onChange={e => setNewPhone(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Имя</label>
                                    <input type="text" placeholder="Имя клиента" value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Город</label>
                                    <input type="text" placeholder="Астана" value={newCity}
                                        onChange={e => setNewCity(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                                <button onClick={() => setShowAddModal(false)}
                                    className="btn bg-gray-100 text-gray-600 hover:bg-gray-200 px-4">Отмена</button>
                                <button onClick={handleAddLead} disabled={!newPhone || addingLead}
                                    className="btn btn-primary px-6">
                                    {addingLead ? 'Создание...' : 'Создать'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
