'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, X, Loader2, Check, User, TrendingUp } from 'lucide-react';

interface Patient {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    totalSpent?: number; // sum of all sales.total for this patient
}

interface PatientSelectProps {
    value: string;
    onChange: (patientId: string, patient?: Patient) => void;
    placeholder?: string;
}

function fmt(n: number) {
    return n.toLocaleString('ru-RU');
}

export default function PatientSelect({
    value,
    onChange,
    placeholder = 'Выберите пациента...',
}: PatientSelectProps) {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showNewForm, setShowNewForm] = useState(false);

    // New patient form
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    function resetForm() {
        setNewName('');
        setNewPhone('');
        setNewEmail('');
        setFormError('');
        setShowNewForm(false);
        setSearch('');
    }

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                resetForm();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open) loadPatients();
    }, [open]);

    useEffect(() => {
        if (open && searchRef.current) {
            setTimeout(() => searchRef.current?.focus(), 50);
        }
    }, [open]);

    async function loadPatients() {
        setLoading(true);
        try {
            const q = search ? `?q=${encodeURIComponent(search)}&noSync=1` : '?noSync=1';
            const res = await fetch(`/api/patients${q}`);
            if (res.ok) {
                const data = await res.json();
                const list: Patient[] = Array.isArray(data) ? data : (data.patients || []);
                setPatients(list);
            }
        } finally {
            setLoading(false);
        }
    }

    // Search with debounce
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => loadPatients(), 300);
        return () => clearTimeout(t);
    }, [search, open]);

    async function handleCreatePatient() {
        if (!newName.trim()) { setFormError('Имя обязательно'); return; }
        if (!newPhone.trim()) { setFormError('Телефон обязателен'); return; }
        setSaving(true);
        setFormError('');
        try {
            const res = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim(), phone: newPhone.trim(), email: newEmail.trim() || undefined }),
            });
            if (!res.ok) {
                const err = await res.json();
                setFormError(err.error || 'Ошибка сохранения');
                return;
            }
            const created: Patient = await res.json();
            setPatients(prev => [created, ...prev]);
            onChange(created.id, created);
            setOpen(false);
            resetForm();
        } finally {
            setSaving(false);
        }
    }

    const selected = patients.find(p => p.id === value);
    const filtered = patients.filter(p =>
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.phone.includes(search)
    );

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => { if (open) { setOpen(false); resetForm(); } else setOpen(true); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-left flex items-center justify-between hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors bg-white"
            >
                {selected ? (
                    <span className="flex items-center gap-2 min-w-0">
                        <User className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                        <span className="truncate font-medium text-gray-900">{selected.name}</span>
                        <span className="text-gray-400 text-xs shrink-0">{selected.phone}</span>
                    </span>
                ) : (
                    <span className="text-gray-400">{placeholder}</span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                    {value && (
                        <span
                            role="button"
                            onClick={e => { e.stopPropagation(); onChange('', undefined); }}
                            className="text-gray-300 hover:text-gray-500 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    {loading ? (
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                    )}
                </div>
            </button>

            {/* Total spent badge — shown below trigger when a patient is selected */}
            {selected && (selected.totalSpent ?? 0) > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 w-fit">
                    <TrendingUp className="w-3 h-3 shrink-0" />
                    <span>Потратил за всё время: <strong>{fmt(selected.totalSpent!)} ₸</strong></span>
                </div>
            )}

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    {!showNewForm && (
                        <>
                            {/* Search */}
                            <div className="px-3 py-2 border-b border-gray-100">
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Поиск по имени или телефону..."
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            {/* Patient list */}
                            <div className="max-h-52 overflow-y-auto">
                                {loading ? (
                                    <div className="px-4 py-4 text-sm text-gray-400 text-center flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="px-4 py-4 text-sm text-gray-400 text-center">Пациенты не найдены</div>
                                ) : filtered.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => { onChange(p.id, p); setOpen(false); resetForm(); }}
                                        className={`w-full text-left px-4 py-2.5 hover:bg-primary-50 flex items-center justify-between gap-2 transition-colors ${value === p.id ? 'bg-primary-50' : ''}`}
                                    >
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                                            <div className="text-[11px] text-gray-400 truncate">
                                                {p.phone}{p.email ? ` • ${p.email}` : ''}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {(p.totalSpent ?? 0) > 0 && (
                                                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 rounded-md px-1.5 py-0.5">
                                                    <TrendingUp className="w-2.5 h-2.5" />
                                                    {fmt(p.totalSpent!)} ₸
                                                </span>
                                            )}
                                            {value === p.id && <Check className="w-4 h-4 text-primary-500" />}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Add new */}
                            <div className="border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowNewForm(true)}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Новый пациент
                                </button>
                            </div>
                        </>
                    )}

                    {/* Inline new patient form */}
                    {showNewForm && (
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-gray-800">Новый пациент</span>
                                <button type="button" onClick={() => { setShowNewForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Имя *</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Иванов Иван Иванович"
                                    autoFocus
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Телефон *</label>
                                <input
                                    type="text"
                                    value={newPhone}
                                    onChange={e => setNewPhone(e.target.value)}
                                    placeholder="+7 (700) 000-00-00"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    placeholder="ivan@example.com"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    onKeyDown={e => { if (e.key === 'Enter') handleCreatePatient(); }}
                                />
                            </div>

                            {formError && <p className="text-xs text-red-600">{formError}</p>}

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setShowNewForm(false); resetForm(); }}
                                    className="flex-1 px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreatePatient}
                                    disabled={saving || !newName.trim() || !newPhone.trim()}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Сохранить
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
