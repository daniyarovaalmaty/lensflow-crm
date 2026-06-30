'use client';

import { useState, useEffect, useCallback } from 'react';
import QuickNav from '@/components/ui/QuickNav';
import { Newspaper, Plus, X, Check, Loader2, Trash2, Pin, Pencil } from 'lucide-react';

interface Post {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    authorName?: string | null;
    createdAt: string;
}

export default function NewsPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [canPost, setCanPost] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [pinned, setPinned] = useState(false);
    const [saving, setSaving] = useState(false);

    const flash = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 3000); };

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/optic/news')
            .then(r => (r.ok ? r.json() : { posts: [], canPost: false }))
            .then(d => { setPosts(Array.isArray(d.posts) ? d.posts : []); setCanPost(!!d.canPost); })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
        // Opening the feed marks everything read → clears the «Новости (+N)» badge.
        fetch('/api/optic/news', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_read' }) });
    }, [load]);

    const openCreate = () => { setEditId(null); setTitle(''); setBody(''); setPinned(false); setShowForm(true); };
    const openEdit = (p: Post) => { setEditId(p.id); setTitle(p.title); setBody(p.body); setPinned(p.pinned); setShowForm(true); };

    const submit = async () => {
        if (!title.trim() || !body.trim()) return;
        setSaving(true);
        const res = editId
            ? await fetch('/api/optic/news', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, title, body, pinned }) })
            : await fetch('/api/optic/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body, pinned }) });
        if (res.ok) { setShowForm(false); flash(true, editId ? 'Сохранено' : 'Опубликовано'); load(); }
        else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setSaving(false);
    };

    const remove = async (id: string) => {
        setBusy(id);
        const res = await fetch(`/api/optic/news?id=${id}`, { method: 'DELETE' });
        if (res.ok) { flash(true, 'Удалено'); load(); }
        else { const e = await res.json().catch(() => ({})); flash(false, e.error || 'Ошибка'); }
        setBusy(null);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-sm"><Newspaper className="w-6 h-6 text-white" /></div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Новости</h1>
                            <p className="text-sm text-gray-500">Объявления и новости компании</p>
                        </div>
                    </div>
                    {canPost && <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold"><Plus className="w-4 h-4" /> Опубликовать</button>}
                </div>

                {loading ? (
                    <div className="text-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-300 mx-auto" /></div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-16 text-gray-400"><Newspaper className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Новостей пока нет</p></div>
                ) : (
                    <div className="grid gap-3">
                        {posts.map(p => (
                            <div key={p.id} className={`bg-white rounded-2xl border p-5 ${p.pinned ? 'border-rose-200 ring-1 ring-rose-100' : 'border-gray-100'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {p.pinned && <span className="badge bg-rose-100 text-rose-700 flex items-center gap-1"><Pin className="w-3 h-3" /> Закреплено</span>}
                                            <h2 className="font-bold text-gray-900">{p.title}</h2>
                                        </div>
                                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{p.body}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-3">
                                            {p.authorName && <span>{p.authorName}</span>}
                                            <span>·</span>
                                            <span>{new Date(p.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    {canPost && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={() => openEdit(p)} className="text-gray-300 hover:text-gray-600 p-1" title="Редактировать"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => remove(p.id)} disabled={busy === p.id} className="text-gray-300 hover:text-red-500 p-1" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={() => !saving && setShowForm(false)}>
                    <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
                            <h2 className="text-lg font-bold text-gray-900">{editId ? 'Редактировать новость' : 'Новая новость'}</h2>
                            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Заголовок</label>
                                <input value={title} onChange={e => setTitle(e.target.value)} autoFocus className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase">Текст</label>
                                <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="w-4 h-4 rounded accent-rose-600" />
                                Закрепить вверху
                            </label>
                        </div>
                        <div className="p-5 border-t border-gray-100 flex items-center justify-end sticky bottom-0 bg-white">
                            <button onClick={submit} disabled={saving || !title.trim() || !body.trim()} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editId ? 'Сохранить' : 'Опубликовать'}</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.text}</div>}
        </div>
    );
}
