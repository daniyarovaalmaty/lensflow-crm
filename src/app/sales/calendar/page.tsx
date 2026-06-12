'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, User, MapPin, Phone, Filter, Trash2, Plus, X } from 'lucide-react';
import { format, isSameDay, isToday, isTomorrow, addDays, parseISO, startOfDay, endOfDay, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';

interface LeadAppointment {
    id: string;
    name: string | null;
    phone: string;
    appointmentAt: string;
    appointmentNotes: string | null;
    doctor: { id: string; fullName: string } | null;
    clinic: { id: string; name: string } | null;
}

export default function CalendarPage() {
    const [appointments, setAppointments] = useState<LeadAppointment[]>([]);
    const [doctors, setDoctors] = useState<{id: string, fullName: string}[]>([]);
    const [clinics, setClinics] = useState<{id: string, name: string}[]>([]);
    const [loading, setLoading] = useState(true);

    const [filterDoctor, setFilterDoctor] = useState('');
    const [filterClinic, setFilterClinic] = useState('');
    const [viewType, setViewType] = useState<'all' | 'week' | 'month'>('week');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [newDoctorId, setNewDoctorId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [filterDoctor, filterClinic]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterDoctor) params.set('doctorId', filterDoctor);
            if (filterClinic) params.set('clinicId', filterClinic);

            const res = await fetch(`/api/crm/appointments?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setAppointments(data.leads);
                // Only set these once to keep filters stable
                if (doctors.length === 0) setDoctors(data.doctors);
                if (clinics.length === 0) setClinics(data.clinics);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Group appointments by day
    const grouped = useMemo(() => {
        const groups: Record<string, LeadAppointment[]> = {};
        const now = startOfDay(new Date());
        const weekEnd = addDays(now, 7);
        const monthEnd = addDays(now, 30);

        appointments.forEach(app => {
            if (!app.appointmentAt) return;
            const appDate = parseISO(app.appointmentAt);
            const d = startOfDay(appDate).toISOString();

            // Filter by viewType
            if (viewType === 'week') {
                if (appDate < now || appDate > endOfDay(weekEnd)) return;
            } else if (viewType === 'month') {
                if (appDate < now || appDate > endOfDay(monthEnd)) return;
            }

            if (!groups[d]) groups[d] = [];
            groups[d].push(app);
        });
        
        // Sort groups by date
        return Object.entries(groups).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    }, [appointments, viewType]);

    const getDayLabel = (dateIso: string) => {
        const d = new Date(dateIso);
        if (isToday(d)) return 'Сегодня';
        if (isTomorrow(d)) return 'Завтра';
        return format(d, 'EEEE, d MMMM', { locale: ru });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-blue-600" /> Календарь записей
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Все предстоящие приемы из MedMundus</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-gray-100 p-1 rounded-xl flex items-center text-sm font-medium">
                        <button 
                            onClick={() => setViewType('all')}
                            className={`px-3 py-1.5 rounded-lg transition-colors ${viewType === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >Все</button>
                        <button 
                            onClick={() => setViewType('week')}
                            className={`px-3 py-1.5 rounded-lg transition-colors ${viewType === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >На неделю</button>
                        <button 
                            onClick={() => setViewType('month')}
                            className={`px-3 py-1.5 rounded-lg transition-colors ${viewType === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >На месяц</button>
                    </div>

                    <div className="relative">
                        <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                            value={filterClinic}
                            onChange={e => setFilterClinic(e.target.value)}
                            className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">Все клиники</option>
                            {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <select
                        value={filterDoctor}
                        onChange={e => setFilterDoctor(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Все врачи</option>
                        {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                    </select>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Добавить
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
            ) : appointments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Нет предстоящих записей</p>
                    <p className="text-sm text-gray-400 mt-1">Синхронизация происходит автоматически при создании записи в MedMundus.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {grouped.map(([dateIso, apps]) => (
                        <div key={dateIso}>
                            <h2 className="text-lg font-bold text-gray-900 mb-4 capitalize border-b border-gray-200 pb-2">
                                {getDayLabel(dateIso)}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {apps.map(app => (
                                    <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                        
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-1 rounded-md text-sm font-semibold">
                                                <Clock className="w-4 h-4" />
                                                {format(parseISO(app.appointmentAt), 'HH:mm')}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {app.clinic && (
                                                    <span className="text-xs font-medium text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                                                        <MapPin className="w-3 h-3" /> {app.clinic.name}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Отменить эту запись?')) return;
                                                        await fetch(`/api/crm/leads/${app.id}`, {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ appointmentAt: null })
                                                        });
                                                        loadData();
                                                    }}
                                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-gray-900 text-base mb-1">{app.name || 'Без имени'}</h3>
                                        
                                        <div className="flex flex-col gap-2 mt-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                {app.phone.replace('@c.us', '')}
                                            </div>
                                            {app.doctor && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    {app.doctor.fullName}
                                                </div>
                                            )}
                                        </div>

                                        {app.appointmentNotes && (
                                            <p className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 italic">
                                                «{app.appointmentNotes}»
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900">Новая запись</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Имя пациента</label>
                                <input 
                                    type="text" 
                                    placeholder="Иван Иванов"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Телефон</label>
                                <input 
                                    type="text" 
                                    placeholder="77001234567"
                                    value={newPhone}
                                    onChange={e => setNewPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Дата</label>
                                    <input 
                                        type="date" 
                                        value={newDate}
                                        onChange={e => setNewDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Время</label>
                                    <input 
                                        type="time" 
                                        value={newTime}
                                        onChange={e => setNewTime(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Врач</label>
                                <select
                                    value={newDoctorId}
                                    onChange={e => setNewDoctorId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                >
                                    <option value="">Выберите врача</option>
                                    {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50/50">
                            <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors"
                            >
                                Отмена
                            </button>
                            <button 
                                disabled={saving || !newPhone || !newDate || !newTime || !newDoctorId}
                                onClick={async () => {
                                    setSaving(true);
                                    try {
                                        // 1. Create or get lead
                                        let leadId;
                                        const phoneJid = newPhone.includes('@') ? newPhone : `${newPhone.replace(/[^0-9]/g, '')}@c.us`;
                                        const res = await fetch('/api/crm/leads', { 
                                            method: 'POST', 
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ phone: phoneJid, name: newName, source: 'manual' }) 
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            leadId = data.id;
                                        } else if (res.status === 409) {
                                            const err = await res.json();
                                            leadId = err.existingLeadId;
                                        }

                                        if (leadId) {
                                            // 2. Patch appointment info
                                            const dateIso = new Date(`${newDate}T${newTime}:00`).toISOString();
                                            await fetch(`/api/crm/leads/${leadId}`, {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ 
                                                    appointmentAt: dateIso, 
                                                    assigneeId: newDoctorId, 
                                                    stage: 'appointment',
                                                    ...(newName ? { name: newName } : {}) 
                                                })
                                            });
                                            setIsAddModalOpen(false);
                                            setNewName('');
                                            setNewPhone('');
                                            setNewDate('');
                                            setNewTime('');
                                            setNewDoctorId('');
                                            loadData();
                                        }
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
                            >
                                {saving ? 'Сохранение...' : 'Записать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
