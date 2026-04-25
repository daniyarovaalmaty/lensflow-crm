'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, User, MapPin, Phone, Filter } from 'lucide-react';
import { format, isSameDay, isToday, isTomorrow, addDays, parseISO, startOfDay } from 'date-fns';
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
        appointments.forEach(app => {
            if (!app.appointmentAt) return;
            const d = startOfDay(parseISO(app.appointmentAt)).toISOString();
            if (!groups[d]) groups[d] = [];
            groups[d].push(app);
        });
        
        // Sort groups by date
        return Object.entries(groups).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    }, [appointments]);

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
                                            {app.clinic && (
                                                <span className="text-xs font-medium text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                                                    <MapPin className="w-3 h-3" /> {app.clinic.name}
                                                </span>
                                            )}
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
        </div>
    );
}
