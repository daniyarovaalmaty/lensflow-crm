'use client';

import { useState, useEffect, useCallback } from 'react';
import QuickNav from '@/components/ui/QuickNav';
import {
    ClipboardList, Plus, X, Check, Loader2, Trash2, Calendar as CalIcon,
    ChevronLeft, ChevronRight, Clock, User, RotateCcw, Inbox, Flag, Play,
} from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    dueDate?: string | null;
    assignedById?: string | null;
    assignedByName?: string | null;
    assignedToId?: string | null;
    assignedToName?: string | null;
    relatedLabel?: string | null;
    createdAt: string;
}
interface Colleague { id: string; fullName: string; email: string; subRole: string; }

type Tab = 'for_me' | 'from_me' | 'calendar';

const STATUS: Record<string, { label: string; cls: string }> = {
    new: { label: 'Новое', cls: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'В работе', cls: 'bg-amber-100 text-amber-700' },
    done: { label: 'Выполнено', cls: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Отменено', cls: 'bg-red-100 text-red-600' },
};
const PRIORITY: Record<string, { label: string; cls: string }> = {
    low: { label: 'Низкий', cls: 'bg-gray-100 text-gray-500' },
    normal: { label: 'Обычный', cls: 'bg-slate-100 text-slate-600' },
    high: { label: 'Высокий', cls: 'bg-orange-100 text-orange-700' },
};
const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayKey = (iso?: string | null) => (iso ? isoDay(new Date(iso)) : null);

export default function TasksPage() {
    const [tab, setTab] = useState<Tab>('for_me');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<Colleague[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

    // calendar state
    const today = new Date();
    const [vy, setVy] = useState(today.getFullYear());
    const [vm, setVm] = useState(today.getMonth());
    const [selDay, setSelDay] = useState<string | null>(null);

    // create form
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [assignee, setAssignee] = useState('');
    const [due, setDue] = useState('');
    const [priority, setPriority] = useState('normal');
    const [saving, setSaving] = useState(false);

    const flash = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3000); };

    const load = useCallback(() => {
        setLoading(true);
        let url = '/api/optic/tasks?scope=' + (tab === 'calendar' ? 'all' : tab);
        if (tab === 'calendar') {
            const from = new Date(vy, vm, 1);
            const to = new Date(vy, vm + 1, 0, 23, 59, 59);
            url += `&from=${from.toISOString()}&to=${to.toISOString()}`;
        }
        fetch(url)
            .then(r => (r.ok ? r.json() : []))
            .then(d => setTasks(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    }, [tab, vy, vm]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { fetch('/api/optic/users').then(r => (r.ok ? r.json() : [])).then(d => setUsers(Array.isArray(d) ? d : [])); }, []);

    const submit = async () => {
        if (!title.trim()) return;
        setSaving(true);
        const res = await fetch('/api/optic/tasks', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description: desc, assignedToId: assignee || undefined, dueDate: due || undefined, priority }),
        });
        if (res.ok) {
            setShowForm(false); setTitle(''); setDesc(''); setAssignee(''); setDue(''); setPriority('normal');
            flash(true, 'Задание создано'); load();
        } else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setSaving(false);
    };

    const patch = async (id: string, payload: any, okMsg: string) => {
        setBusy(id);
        const res = await fetch('/api/optic/tasks', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...payload }),
        });
        if (res.ok) { flash(true, okMsg); load(); }
        else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setBusy(null);
    };

    const remove = async (id: string) => {
        setBusy(id);
        const res = await fetch(`/api/optic/tasks?id=${id}`, { method: 'DELETE' });
        if (res.ok) { flash(true, 'Удалено'); load(); }
        else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setBusy(null);
    };

    const openCreate = (prefillDay?: string) => {
        setDue(prefillDay || ''); setShowForm(true);
    };

    // ----- calendar derived -----
    const firstWeekday = (new Date(vy, vm, 1).getDay() + 6) % 7; // Mon-first offset
    const daysInMonth = new Date(vy, vm + 1, 0).getDate();
    const byDay = new Map<string, Task[]>();
    for (const t of tasks) { const k = dayKey(t.dueDate); if (k) { if (!byDay.has(k)) byDay.set(k, []); byDay.get(k)!.push(t); } }
    const monthTitle = new Date(vy, vm, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const prevMonth = () => { setSelDay(null); if (vm === 0) { setVy(vy - 1); setVm(11); } else setVm(vm - 1); };
    const nextMonth = () => { setSelDay(null); if (vm === 11) { setVy(vy + 1); setVm(0); } else setVm(vm + 1); };
    const selDayTasks = selDay ? (byDay.get(selDay) || []) : [];

    const renderTaskCard = (t: Task) => {
        const due = t.dueDate ? new Date(t.dueDate) : null;
        const overdue = due && t.status !== 'done' && t.status !== 'cancelled' && due < new Date(new Date().toDateString());
        return (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-gray-900 ${t.status === 'done' ? 'line-through text-gray-400' : ''}`}>{t.title}</span>
                            <span className={`badge ${STATUS[t.status]?.cls || 'bg-gray-100 text-gray-600'}`}>{STATUS[t.status]?.label || t.status}</span>
                            {t.priority === 'high' && <span className={`badge ${PRIORITY.high.cls} flex items-center gap-1`}><Flag className="w-3 h-3" /> Важное</span>}
                        </div>
                        {t.description && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{t.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-2 flex-wrap">
                            {t.assignedToName && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {t.assignedToName}</span>}
                            {t.assignedByName && <span>от {t.assignedByName}</span>}
                            {due && <span className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : ''}`}><Clock className="w-3.5 h-3.5" /> {due.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}{overdue ? ' • просрочено' : ''}</span>}
                            {t.relatedLabel && <span className="text-gray-400">· {t.relatedLabel}</span>}
                        </div>
                    </div>
                    <button onClick={() => remove(t.id)} disabled={busy === t.id} className="text-gray-300 hover:text-red-500 flex-shrink-0" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                    {t.status === 'new' && <button disabled={busy === t.id} onClick={() => patch(t.id, { status: 'in_progress' }, 'В работе')} className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 disabled:opacity-50"><Play className="w-3.5 h-3.5" /> В работу</button>}
                    {(t.status === 'new' || t.status === 'in_progress') && <button disabled={busy === t.id} onClick={() => patch(t.id, { status: 'done' }, 'Выполнено')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Выполнить</button>}
                    {(t.status === 'done' || t.status === 'cancelled') && <button disabled={busy === t.id} onClick={() => patch(t.id, { status: 'in_progress' }, 'Возвращено в работу')} className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5" /> Вернуть</button>}
                    {(t.status === 'new' || t.status === 'in_progress') && <button disabled={busy === t.id} onClick={() => patch(t.id, { status: 'cancelled' }, 'Отменено')} className="text-xs font-medium text-gray-400 hover:text-red-500 flex items-center gap-1 disabled:opacity-50 ml-auto">Отменить</button>}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-sm"><ClipboardList className="w-6 h-6 text-white" /></div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Задания</h1>
                            <p className="text-sm text-gray-500">Поручения сотрудникам и календарь</p>
                        </div>
                    </div>
                    <button onClick={() => openCreate()} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold"><Plus className="w-4 h-4" /> Новое задание</button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-5 w-fit">
                    {([['for_me', 'Задания для меня'], ['from_me', 'Задания от меня'], ['calendar', 'Календарь заданий']] as [Tab, string][]).map(([k, label]) => (
                        <button key={k} onClick={() => { setTab(k); setSelDay(null); }} className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{label}</button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-300 mx-auto" /></div>
                ) : tab === 'calendar' ? (
                    <div>
                        {/* Calendar header */}
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-5 h-5" /></button>
                            <span className="text-lg font-semibold text-gray-800 capitalize min-w-[160px] text-center">{monthTitle}</span>
                            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                        {/* Grid */}
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/60">
                                {WEEKDAYS.map((d, i) => <div key={d} className="px-2 py-2 text-xs font-semibold text-gray-400 text-center"><span className="hidden sm:inline">{d}</span><span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span></div>)}
                            </div>
                            <div className="grid grid-cols-7">
                                {Array.from({ length: firstWeekday }).map((_, i) => <div key={`b${i}`} className="min-h-[84px] border-b border-r border-gray-50 bg-gray-50/30" />)}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const key = `${vy}-${String(vm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const dts = byDay.get(key) || [];
                                    const isToday = vy === today.getFullYear() && vm === today.getMonth() && day === today.getDate();
                                    const isSel = selDay === key;
                                    return (
                                        <button key={key} onClick={() => setSelDay(isSel ? null : key)} className={`min-h-[84px] border-b border-r border-gray-50 p-1.5 text-left align-top hover:bg-purple-50/40 transition-colors ${isSel ? 'bg-purple-50' : ''}`}>
                                            <span className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${isToday ? 'bg-purple-600 text-white font-bold' : 'text-gray-600'}`}>{day}</span>
                                            <div className="mt-1 space-y-0.5">
                                                {dts.slice(0, 2).map(t => (
                                                    <div key={t.id} className={`text-[11px] leading-tight truncate px-1 py-0.5 rounded ${t.status === 'done' ? 'bg-emerald-50 text-emerald-600 line-through' : t.status === 'cancelled' ? 'bg-gray-50 text-gray-400' : 'bg-purple-100 text-purple-700'}`}>{t.title}</div>
                                                ))}
                                                {dts.length > 2 && <div className="text-[11px] text-gray-400 px-1">+{dts.length - 2}</div>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Selected day tasks */}
                        {selDay && (
                            <div className="mt-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-800">{new Date(selDay).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}</h3>
                                    <button onClick={() => openCreate(selDay)} className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"><Plus className="w-4 h-4" /> Добавить</button>
                                </div>
                                {selDayTasks.length === 0 ? <p className="text-sm text-gray-400">На этот день заданий нет</p> : <div className="grid gap-3">{selDayTasks.map(renderTaskCard)}</div>}
                            </div>
                        )}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-16 text-gray-400"><Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">{tab === 'for_me' ? 'Вам пока не назначено заданий' : 'Вы пока не создавали заданий'}</p></div>
                ) : (
                    <div className="grid gap-3">{tasks.map(renderTaskCard)}</div>
                )}
            </main>

            {/* Create modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={() => !saving && setShowForm(false)}>
                    <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
                            <h2 className="text-lg font-bold text-gray-900">Новое задание</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Название</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder="Что нужно сделать" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Описание</label>
                                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Исполнитель</label>
                                <select value={assignee} onChange={e => setAssignee(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                                    <option value="">— себе —</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Срок</label>
                                    <input type="date" value={due} onChange={e => setDue(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Приоритет</label>
                                    <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
                                        <option value="low">Низкий</option>
                                        <option value="normal">Обычный</option>
                                        <option value="high">Высокий</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex items-center justify-end sticky bottom-0 bg-white">
                            <button onClick={submit} disabled={saving || !title.trim()} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Создать</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.text}</div>}
        </div>
    );
}
