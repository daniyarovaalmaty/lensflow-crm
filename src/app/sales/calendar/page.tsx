'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, User, MapPin, Phone, Filter, Trash2, Plus, X, ChevronLeft, ChevronRight, FileText, FileEdit } from 'lucide-react';
import { format, isSameDay, isToday, isTomorrow, addDays, subDays, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, subMonths, addMonths, subWeeks, addWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';

interface LeadAppointment {
    id: string;
    name: string | null;
    phone: string;
    appointmentAt: string;
    appointmentNotes: string | null;
    doctor: { id: string; fullName: string } | null;
    clinic: { id: string; name: string } | null;
    duration?: number;
}

const APPT_TYPES: Record<string, string> = {
    consultation: 'Консультация',
    primary_consultation: 'Первичный прием',
    repeat_consultation: 'Повторный прием',
    primary_ok_fitting: 'Первичный подбор ночных линз',
    repeat_fitting: 'Повторный подбор',
    ok_delivery: 'Выдача ночных линз',
};

export default function CalendarPage() {
    const [appointments, setAppointments] = useState<LeadAppointment[]>([]);
    const [doctors, setDoctors] = useState<{id: string, fullName: string}[]>([]);
    const [clinics, setClinics] = useState<{id: string, name: string}[]>([]);
    const [loading, setLoading] = useState(true);

    const [filterDoctor, setFilterDoctor] = useState('');
    const [filterClinic, setFilterClinic] = useState('');
    const [viewType, setViewType] = useState<'all' | 'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = useState(new Date());

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [newDoctorId, setNewDoctorId] = useState('');
    const [newType, setNewType] = useState('primary_consultation');
    const [newDuration, setNewDuration] = useState(30);
    const [saving, setSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingAppId, setEditingAppId] = useState<string | null>(null);
    
    // Detailed view modal for month view
    const [selectedDayApps, setSelectedDayApps] = useState<{date: Date, apps: LeadAppointment[]} | null>(null);

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
                if (doctors.length === 0) setDoctors(data.doctors);
                if (clinics.length === 0) setClinics(data.clinics);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePrev = () => {
        if (viewType === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else if (viewType === 'month') setCurrentDate(subMonths(currentDate, 1));
        else setCurrentDate(subDays(currentDate, 1)); // 'all' view has no real pagination yet, but whatever
    };

    const handleNext = () => {
        if (viewType === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else if (viewType === 'month') setCurrentDate(addMonths(currentDate, 1));
        else setCurrentDate(addDays(currentDate, 1));
    };


    const openEditModal = (app: LeadAppointment) => {
        setNewName(app.name || '');
        setNewPhone(app.phone ? app.phone.replace('@c.us', '') : '');
        if (app.appointmentAt) {
            const d = parseISO(app.appointmentAt);
            setNewDate(format(d, 'yyyy-MM-dd'));
            setNewTime(format(d, 'HH:mm'));
        }
        setNewType(app.appointmentNotes || 'primary_consultation');
        setNewDuration(app.duration || 30);
        setNewDoctorId(app.doctor?.id || '');
        setEditingAppId(app.id);
        setIsEditMode(true);
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Отменить эту запись?')) return;
        if (id.startsWith('appt-')) {
            const realId = id.replace('appt-', '');
            await fetch(`/api/appointments/${realId}`, { method: 'DELETE' });
        } else {
            await fetch(`/api/crm/leads/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentAt: null })
            });
        }
        loadData();
    };

    const renderAppointmentCard = (app: LeadAppointment, compact: boolean = false) => {
        if (compact) {
            return (
                <div key={app.id} className="text-xs p-1 mb-1 bg-blue-50 text-blue-700 rounded border border-blue-100 truncate cursor-pointer hover:bg-blue-100" onClick={(e) => e.stopPropagation()}>
                    <span className="font-semibold">{format(parseISO(app.appointmentAt), 'HH:mm')}{app.duration ? ` (${app.duration} мин)` : ''}</span> {app.name || 'Без имени'}
                </div>
            );
        }

        return (
            <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden mb-3">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-1 rounded-md text-sm font-semibold">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(app.appointmentAt), 'HH:mm')}
                        {app.duration ? ` (${app.duration} мин)` : ''}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => openEditModal(app)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                            <FileEdit className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => handleDelete(app.id)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{app.name || 'Без имени'}</h3>
                
                <div className="flex flex-col gap-1 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {app.phone.replace('@c.us', '')}
                    </div>
                    {app.appointmentNotes && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 truncate mt-1">
                            <FileText className="w-3 h-3 text-gray-400" />
                            {APPT_TYPES[app.appointmentNotes] || app.appointmentNotes}
                        </div>
                    )}
                    {app.doctor && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 truncate">
                            <User className="w-3 h-3 text-gray-400" />
                            {app.doctor.fullName}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end });

        return (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {days.map(day => {
                    const dayApps = appointments.filter(app => {
                        if (!app.appointmentAt) return false;
                        return isSameDay(parseISO(app.appointmentAt), day);
                    }).sort((a, b) => new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime());

                    return (
                        <div key={day.toISOString()} className="flex flex-col h-full min-h-[500px] bg-gray-50 rounded-2xl p-3 border border-gray-100">
                            <div className={`text-center pb-3 mb-3 border-b ${isToday(day) ? 'border-blue-500' : 'border-gray-200'}`}>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{format(day, 'EEEE', { locale: ru })}</p>
                                <p className={`text-lg font-bold mt-1 ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>{format(day, 'd MMM', { locale: ru })}</p>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {dayApps.length > 0 ? dayApps.map(app => renderAppointmentCard(app)) : (
                                    <p className="text-xs text-center text-gray-400 mt-4">Нет записей</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        const weekDays = eachDayOfInterval({
            start: startOfWeek(currentDate, { weekStartsOn: 1 }),
            end: endOfWeek(currentDate, { weekStartsOn: 1 })
        });

        return (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                    {weekDays.map(day => (
                        <div key={day.toISOString()} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r last:border-r-0 border-gray-200">
                            {format(day, 'EEEE', { locale: ru })}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-[120px]">
                    {days.map((day, idx) => {
                        const dayApps = appointments.filter(app => {
                            if (!app.appointmentAt) return false;
                            return isSameDay(parseISO(app.appointmentAt), day);
                        }).sort((a, b) => new Date(a.appointmentAt).getTime() - new Date(b.appointmentAt).getTime());

                        const isCurrentMonth = isSameMonth(day, currentDate);

                        return (
                            <div 
                                key={day.toISOString()} 
                                onClick={() => dayApps.length > 0 && setSelectedDayApps({date: day, apps: dayApps})}
                                className={`border-r border-b border-gray-100 p-2 overflow-hidden transition-colors ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'} ${isToday(day) ? 'bg-blue-50/30' : ''} ${dayApps.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                            >
                                <div className={`text-sm font-medium mb-1 flex items-center justify-between ${isToday(day) ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-blue-100' : ''}`}>{format(day, 'd')}</span>
                                    {dayApps.length > 0 && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 rounded-full">{dayApps.length}</span>}
                                </div>
                                <div className="space-y-1">
                                    {dayApps.slice(0, 3).map(app => renderAppointmentCard(app, true))}
                                    {dayApps.length > 3 && (
                                        <div className="text-xs text-center text-gray-500 bg-gray-50 rounded p-1">
                                            + ещё {dayApps.length - 3}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderAllView = () => {
        // Group appointments by day for 'all' view
        const groups: Record<string, LeadAppointment[]> = {};
        appointments.forEach(app => {
            if (!app.appointmentAt) return;
            const d = startOfDay(parseISO(app.appointmentAt)).toISOString();
            if (!groups[d]) groups[d] = [];
            groups[d].push(app);
        });
        const grouped = Object.entries(groups).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

        const getDayLabel = (dateIso: string) => {
            const d = new Date(dateIso);
            if (isToday(d)) return 'Сегодня';
            if (isTomorrow(d)) return 'Завтра';
            return format(d, 'EEEE, d MMMM', { locale: ru });
        };

        if (appointments.length === 0) return (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Нет предстоящих записей</p>
            </div>
        );

        return (
            <div className="space-y-8">
                {grouped.map(([dateIso, apps]) => (
                    <div key={dateIso}>
                        <h2 className="text-lg font-bold text-gray-900 mb-4 capitalize border-b border-gray-200 pb-2">
                            {getDayLabel(dateIso)}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {apps.map(app => renderAppointmentCard(app))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const getHeaderLabel = () => {
        if (viewType === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            if (isSameMonth(start, end)) return format(start, 'MMMM yyyy', { locale: ru });
            if (start.getFullYear() === end.getFullYear()) return `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM yyyy', { locale: ru })}`;
            return `${format(start, 'd MMM yyyy', { locale: ru })} - ${format(end, 'd MMM yyyy', { locale: ru })}`;
        }
        if (viewType === 'month') return format(currentDate, 'MMMM yyyy', { locale: ru });
        return 'Все предстоящие приемы';
    };

    return (
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <CalendarIcon className="w-6 h-6 text-blue-600" /> Календарь записей
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 capitalize">{getHeaderLabel()}</p>
                    </div>

                    {(viewType === 'week' || viewType === 'month') && (
                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 ml-4 shadow-sm">
                            <button onClick={handlePrev} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-lg text-gray-700">Сегодня</button>
                            <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-gray-100 p-1 rounded-xl flex items-center text-sm font-medium">
                        <button 
                            onClick={() => setViewType('all')}
                            className={`px-3 py-1.5 rounded-lg transition-colors ${viewType === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >Все</button>
                        <button 
                            onClick={() => { setViewType('week'); setCurrentDate(new Date()); }}
                            className={`px-3 py-1.5 rounded-lg transition-colors ${viewType === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >На неделю</button>
                        <button 
                            onClick={() => { setViewType('month'); setCurrentDate(new Date()); }}
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
            ) : (
                <>
                    {viewType === 'all' && renderAllView()}
                    {viewType === 'week' && renderWeekView()}
                    {viewType === 'month' && renderMonthView()}
                </>
            )}

            {selectedDayApps && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h2 className="text-lg font-bold text-gray-900 capitalize">
                                {format(selectedDayApps.date, 'EEEE, d MMMM', { locale: ru })}
                            </h2>
                            <button onClick={() => setSelectedDayApps(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <div className="space-y-4">
                                {selectedDayApps.apps.map(app => renderAppointmentCard(app))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900">{isEditMode ? 'Редактировать запись' : 'Новая запись'}</h2>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); setEditingAppId(null); }} className="text-gray-400 hover:text-gray-600 p-1">
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
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Длительность (мин)</label>
                                <input 
                                    type="number" 
                                    value={newDuration}
                                    onChange={e => setNewDuration(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Тип приема</label>
                                    <select
                                        value={newType}
                                        onChange={e => setNewType(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                    >
                                        {Object.entries(APPT_TYPES).map(([k, v]) => (
                                            <option key={k} value={k}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Врач</label>
                                    <select
                                        value={newDoctorId}
                                        onChange={e => setNewDoctorId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                    >
                                        <option value="">Без врача</option>
                                        {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50/50">
                            <button 
                                onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); setEditingAppId(null); }}
                                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors"
                            >
                                Отмена
                            </button>
                            <button 
                                disabled={saving || !newPhone || !newDate || !newTime || !newDoctorId}
                                onClick={async () => {
                                    setSaving(true);
                                    try {

                                        const dateTime = new Date(`${newDate}T${newTime}`);
                                        if (isEditMode && editingAppId) {
                                            if (editingAppId.startsWith('appt-')) {
                                                const realId = editingAppId.replace('appt-', '');
                                                await fetch(`/api/appointments/${realId}`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        date: dateTime.toISOString(),
                                                        duration: newDuration,
                                                        patientName: newName,
                                                        patientPhone: newPhone,
                                                        type: newType,
                                                        doctorId: newDoctorId || undefined
                                                    })
                                                });
                                            } else {
                                                await fetch(`/api/crm/leads/${editingAppId}`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        appointmentAt: dateTime.toISOString(),
                                                        appointmentNotes: newType,
                                                        doctorId: newDoctorId || null,
                                                        name: newName,
                                                        phone: newPhone
                                                    })
                                                });
                                            }
                                        } else {
                                            await fetch('/api/appointments', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    date: dateTime.toISOString(),
                                                    duration: newDuration,
                                                    patientName: newName,
                                                    patientPhone: newPhone,
                                                    type: newType,
                                                    doctorId: newDoctorId || undefined
                                                })
                                            });
                                        }
                                        setIsAddModalOpen(false);
                                        setIsEditMode(false);
                                        setEditingAppId(null);

                                        if (true) {
                                            setNewName('');
                                            setNewPhone('');
                                            setNewDate('');
                                            setNewTime('');
                                            setNewDoctorId('');
                                            setNewType('primary_consultation');
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
