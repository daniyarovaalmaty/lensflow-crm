'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquarePlus, CheckCircle2, Clock, AlertCircle, XCircle, Send, ChevronDown, ChevronUp, ArrowLeft, Filter } from 'lucide-react';
import Link from 'next/link';

interface Ticket {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    adminComment: string | null;
    author: { id: string; fullName: string; email: string; role: string; subRole: string };
    createdAt: string;
    updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    new_ticket: { label: 'Новый', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: AlertCircle },
    in_progress: { label: 'В работе', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
    done: { label: 'Реализовано', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle2 },
    rejected: { label: 'Отклонено', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
};

const CATEGORY_LABELS: Record<string, string> = {
    feature: '✨ Доработка',
    bug: '🐛 Ошибка',
    question: '❓ Вопрос',
};

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Низкий',
    normal: 'Обычный',
    high: 'Высокий',
};

export default function SupportPage() {
    const { data: session } = useSession();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Form
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('feature');
    const [priority, setPriority] = useState('normal');

    // Admin edit
    const [editingId, setEditingId] = useState<string | null>(null);
    const [adminComment, setAdminComment] = useState('');
    const [adminStatus, setAdminStatus] = useState('');

    const fetchTickets = useCallback(async () => {
        try {
            const res = await fetch('/api/support');
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets);
                setIsAdmin(data.isAdmin);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;
        setSending(true);
        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, category, priority }),
            });
            if (res.ok) {
                setTitle('');
                setDescription('');
                setCategory('feature');
                setPriority('normal');
                setShowForm(false);
                fetchTickets();
            }
        } finally {
            setSending(false);
        }
    };

    const handleAdminUpdate = async (ticketId: string) => {
        try {
            const res = await fetch(`/api/support/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: adminStatus, adminComment }),
            });
            if (res.ok) {
                setEditingId(null);
                setAdminComment('');
                setAdminStatus('');
                fetchTickets();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const filtered = filterStatus === 'all' ? tickets : tickets.filter(t => t.status === filterStatus);

    const backHref = session?.user?.role === 'laboratory'
        ? '/laboratory/production'
        : session?.user?.role === 'optic'
            ? '/optic/dashboard'
            : '/optic/dashboard';

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={backHref} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Служба поддержки</h1>
                            <p className="text-xs text-gray-500">Заявки на доработки и сообщения об ошибках</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <MessageSquarePlus className="w-4 h-4" />
                        Новая заявка
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* New Ticket Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <MessageSquarePlus className="w-5 h-5 text-blue-600" />
                            Новая заявка
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="feature">✨ Доработка</option>
                                    <option value="bug">🐛 Ошибка</option>
                                    <option value="question">❓ Вопрос</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                                <select
                                    value={priority}
                                    onChange={e => setPriority(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="low">Низкий</option>
                                    <option value="normal">Обычный</option>
                                    <option value="high">Высокий</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Краткое описание проблемы или предложения"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Подробное описание *</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Опишите подробно что нужно сделать или что не работает..."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                            >
                                Отмена
                            </button>
                            <button
                                type="submit"
                                disabled={sending || !title.trim() || !description.trim()}
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                {sending ? 'Отправка...' : 'Отправить'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                    {[
                        { key: 'all', label: 'Все', count: tickets.length },
                        { key: 'new_ticket', label: 'Новые', count: tickets.filter(t => t.status === 'new_ticket').length },
                        { key: 'in_progress', label: 'В работе', count: tickets.filter(t => t.status === 'in_progress').length },
                        { key: 'done', label: 'Реализовано', count: tickets.filter(t => t.status === 'done').length },
                        { key: 'rejected', label: 'Отклонено', count: tickets.filter(t => t.status === 'rejected').length },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilterStatus(tab.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                filterStatus === tab.key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {tab.label} {tab.count > 0 && <span className="ml-1 opacity-75">({tab.count})</span>}
                        </button>
                    ))}
                </div>

                {/* Ticket List */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <MessageSquarePlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Нет заявок</p>
                        <p className="text-gray-400 text-xs mt-1">Нажмите «Новая заявка» чтобы создать первую</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(ticket => {
                            const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.new_ticket;
                            const StatusIcon = sc.icon;
                            const isExpanded = expandedId === ticket.id;
                            const isEditing = editingId === ticket.id;

                            return (
                                <div key={ticket.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${sc.bg}`}>
                                    {/* Header */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                                        className="w-full px-5 py-4 flex items-start gap-3 text-left"
                                    >
                                        <StatusIcon className={`w-5 h-5 mt-0.5 shrink-0 ${sc.color}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-gray-900 text-sm">{ticket.title}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                                    {CATEGORY_LABELS[ticket.category] || ticket.category}
                                                </span>
                                                {ticket.priority === 'high' && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">🔥 Высокий</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                <span>{ticket.author.fullName || ticket.author.email}</span>
                                                <span>·</span>
                                                <span>{new Date(ticket.createdAt).toLocaleDateString('ru-RU')}</span>
                                                <span>·</span>
                                                <span className={`font-medium ${sc.color}`}>{sc.label}</span>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                                    </button>

                                    {/* Expanded */}
                                    {isExpanded && (
                                        <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                                            <p className="text-sm text-gray-700 pt-3 whitespace-pre-wrap">{ticket.description}</p>

                                            {ticket.adminComment && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                    <p className="text-xs font-semibold text-blue-700 mb-1">💬 Ответ администратора</p>
                                                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{ticket.adminComment}</p>
                                                </div>
                                            )}

                                            {/* Admin controls */}
                                            {isAdmin && !isEditing && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingId(ticket.id);
                                                        setAdminStatus(ticket.status);
                                                        setAdminComment(ticket.adminComment || '');
                                                    }}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    ✏️ Изменить статус / ответить
                                                </button>
                                            )}

                                            {isAdmin && isEditing && (
                                                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Статус</label>
                                                        <select
                                                            value={adminStatus}
                                                            onChange={e => setAdminStatus(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                        >
                                                            <option value="new_ticket">🆕 Новый</option>
                                                            <option value="in_progress">🔧 В работе</option>
                                                            <option value="done">✅ Реализовано</option>
                                                            <option value="rejected">❌ Отклонено</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Комментарий</label>
                                                        <textarea
                                                            value={adminComment}
                                                            onChange={e => setAdminComment(e.target.value)}
                                                            placeholder="Ваш ответ на заявку..."
                                                            rows={3}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleAdminUpdate(ticket.id)}
                                                            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                                                        >
                                                            Сохранить
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                                                        >
                                                            Отмена
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
