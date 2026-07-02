'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format, addDays, subDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, User, Clock, FileText, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Appointment {
    id: string;
    patientId?: string | null;
    patient?: { id: string; name: string; phone: string };
    patientName?: string | null;
    patientPhone?: string | null;
    doctorId?: string | null;
    doctor?: { id: string; fullName: string };
    date: string;
    duration: number;
    status: string;
    type: string;
    notes?: string | null;
    createdBy?: { id: string; fullName: string } | null;
}

const APPT_TYPES: Record<string, string> = {
    consultation: 'Консультация',
    primary_consultation: 'Первичный прием',
    repeat_consultation: 'Повторный прием',
    primary_ok_fitting: 'Первичный подбор ночных линз',
    repeat_fitting: 'Повторный подбор',
    ok_delivery: 'Выдача ночных линз',
};

export default function DoctorCalendar() {
    const { data: session } = useSession();
    const router = useRouter();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

    // New appointment state
    const [newApptDate, setNewApptDate] = useState('');
    const [newApptTime, setNewApptTime] = useState('');
    const [newApptType, setNewApptType] = useState('primary_consultation');
    const [newApptDuration, setNewApptDuration] = useState(30);
    const [newApptDoctorId, setNewApptDoctorId] = useState('');

    // Patient selection state
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);
    const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [newApptPhone, setNewApptPhone] = useState('');

    const fetchAppointments = async () => {
        try {
            setIsLoading(true);
            const start = startOfWeek(currentDate, { weekStartsOn: 1 }).toISOString();
            const end = endOfWeek(currentDate, { weekStartsOn: 1 }).toISOString();
            const res = await fetch(`/api/appointments?startDate=${start}&endDate=${end}`);
            if (res.ok) {
                const data = await res.json();
                setAppointments(data);
            }
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
            toast.error('Ошибка загрузки расписания');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchAppointments();
            if ((session.user as any)?.subRole === 'optic_manager') {
                fetch('/api/clinic-staff')
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) {
                            setDoctors(data.filter((u: any) => u.subRole === 'optic_doctor'));
                        }
                    })
                    .catch(console.error);
            }
        }
    }, [session, currentDate]);

    // Search patients debounce
    useEffect(() => {
        if (!patientSearchQuery.trim() || selectedPatient) {
            setPatientSearchResults([]);
            return;
        }
        
        const timeoutId = setTimeout(async () => {
            setIsSearchingPatient(true);
            try {
                const res = await fetch(`/api/patients?q=${encodeURIComponent(patientSearchQuery)}&noSync=1`);
                if (res.ok) {
                    const data = await res.json();
                    setPatientSearchResults(data.patients || []);
                }
            } catch (err) {
                console.error('Failed to search patients', err);
            } finally {
                setIsSearchingPatient(false);
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [patientSearchQuery, selectedPatient]);

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dateTime = new Date(`${newApptDate}T${newApptTime}`);
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateTime.toISOString(),
                    duration: newApptDuration,
                    patientId: selectedPatient?.id || undefined,
                    patientName: selectedPatient ? undefined : patientSearchQuery,
                    patientPhone: selectedPatient ? undefined : newApptPhone,
                    type: newApptType,
                    doctorId: newApptDoctorId || undefined
                })
            });
            if (res.ok) {
                toast.success('Запись создана');
                setIsModalOpen(false);
                fetchAppointments();
                resetNewApptForm();
            } else {
                toast.error('Не удалось создать запись');
            }
        } catch (error) {
            console.error(error);
            toast.error('Произошла ошибка');
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/appointments/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                toast.success('Статус обновлен');
                fetchAppointments();
                if (selectedAppointment && selectedAppointment.id === id) {
                    setSelectedAppointment(prev => prev ? { ...prev, status } : null);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Ошибка обновления статуса');
        }
    };

    const resetNewApptForm = () => {
        setPatientSearchQuery('');
        setNewApptPhone('');
        setSelectedPatient(null);
        setPatientSearchResults([]);
        setNewApptType('primary_consultation');
        setNewApptDuration(30);
        setNewApptDoctorId('');
    };

    const openNewModal = (date?: Date) => {
        const d = date || new Date();
        setNewApptDate(format(d, 'yyyy-MM-dd'));
        setNewApptTime(format(d, 'HH:mm'));
        setSelectedAppointment(null);
        setIsModalOpen(true);
    };

    const openDetailsModal = (appt: Appointment) => {
        setSelectedAppointment(appt);
        setIsModalOpen(true);
    };

    const handleStartConsultation = async () => {
        if (!selectedAppointment) return;
        
        if (selectedAppointment.patientId) {
            router.push(`/optic/patients/${selectedAppointment.patientId}`);
        } else {
            const toastId = toast.loading('Создание профиля пациента...');
            try {
                // Создаем карточку пациента из данных записи
                const res = await fetch('/api/patients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: selectedAppointment.patientName || 'Неизвестный пациент',
                        phone: selectedAppointment.patientPhone || '',
                        doctorId: session?.user?.id
                    })
                });
                
                if (res.ok) {
                    const patient = await res.json();
                    
                    // Привязываем запись к новому пациенту
                    await fetch(`/api/appointments/${selectedAppointment.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ patientId: patient.id })
                    });
                    
                    toast.success('Профиль создан', { id: toastId });
                    router.push(`/optic/patients/${patient.id}`);
                } else {
                    toast.error('Ошибка создания пациента', { id: toastId });
                    router.push('/optic/patients');
                }
            } catch (error) {
                toast.error('Ошибка сети', { id: toastId });
                router.push('/optic/patients');
            }
        }
    };

    const handleCreateOrder = () => {
        if (!selectedAppointment) return;
        if (selectedAppointment.patientId) {
            router.push(`/optic/orders/new?patientId=${selectedAppointment.patientId}`);
        } else {
            router.push(`/optic/orders/new?patientName=${encodeURIComponent(selectedAppointment.patientName || '')}&patientPhone=${encodeURIComponent(selectedAppointment.patientPhone || '')}`);
        }
    };

    // View logic (Day view for now as requested default)
    const todaysAppointments = appointments.filter(a => isSameDay(new Date(a.date), currentDate));

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 mb-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <label className="p-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors relative overflow-hidden group">
                        <CalendarIcon className="w-5 h-5" />
                        <input 
                            type="date" 
                            className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
                            value={format(currentDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                if (e.target.value) setCurrentDate(new Date(e.target.value));
                            }}
                        />
                    </label>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Расписание на {format(currentDate, 'd MMMM', { locale: ru })}</h2>
                        <p className="text-sm text-gray-500">{todaysAppointments.length} записей</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-lg text-gray-700">
                        Сегодня
                    </button>
                    <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-gray-200 mx-2" />
                    <button onClick={() => openNewModal(currentDate)} className="btn btn-primary text-sm py-2 px-3 gap-1.5">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Новая запись</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : todaysAppointments.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">На этот день нет записей</p>
                    <button onClick={() => openNewModal(currentDate)} className="text-primary-600 font-medium hover:text-primary-700">
                        Добавить запись
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {todaysAppointments.map((appt) => (
                        <div 
                            key={appt.id} 
                            onClick={() => openDetailsModal(appt)}
                            className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl border border-gray-100 cursor-pointer transition-colors"
                        >
                            <div className="w-16 text-center">
                                <div className="text-sm font-bold text-gray-900">{format(new Date(appt.date), 'HH:mm')}</div>
                                <div className="text-xs text-gray-500">{appt.duration} мин</div>
                            </div>
                            <div className="w-1 h-12 bg-blue-400 rounded-full"></div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                    {appt.patient?.name || appt.patientName || 'Неизвестный пациент'}
                                </div>
                                <div className="text-sm text-gray-500 truncate flex items-center gap-2">
                                    <span className="capitalize">{APPT_TYPES[appt.type] || appt.type}</span>
                                    {appt.doctor && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1 text-xs">
                                                <User className="w-3 h-3" /> {appt.doctor.fullName}
                                            </span>
                                        </>
                                    )}
                                </div>
                                {appt.createdBy && (
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        Записал(а): {appt.createdBy.fullName}
                                    </div>
                                )}
                            </div>
                            <div>
                                {appt.status === 'scheduled' && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">Запланирован</span>}
                                {appt.status === 'completed' && <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full">Завершен</span>}
                                {appt.status === 'cancelled' && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">Отменен</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">
                                {selectedAppointment ? 'Карточка записи' : 'Новая запись'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-4 sm:p-6">
                            {selectedAppointment ? (
                                <div className="space-y-6">
                                    <div>
                                        <div className="text-sm text-gray-500 mb-1">Пациент</div>
                                        <div className="font-medium text-lg">{selectedAppointment.patient?.name || selectedAppointment.patientName}</div>
                                        <div className="text-gray-600">{selectedAppointment.patient?.phone || selectedAppointment.patientPhone}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-sm text-gray-500 mb-1">Время</div>
                                            <div className="font-medium">{format(new Date(selectedAppointment.date), 'dd.MM.yyyy HH:mm')}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500 mb-1">Доктор</div>
                                            <div className="font-medium">{selectedAppointment.doctor?.fullName || '-'}</div>
                                        </div>
                                    </div>
                                    {selectedAppointment.notes && (
                                        <div>
                                            <div className="text-sm text-gray-500 mb-1">Заметки</div>
                                            <div className="bg-gray-50 p-3 rounded-lg text-sm">{selectedAppointment.notes}</div>
                                        </div>
                                    )}
                                    {selectedAppointment.createdBy && (
                                        <div className="text-xs text-gray-400 text-right">
                                            Записал(а): {selectedAppointment.createdBy.fullName}
                                        </div>
                                    )}
                                    
                                    <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                                        <button onClick={handleStartConsultation} className="btn btn-primary w-full justify-center">
                                            <FileText className="w-4 h-4 mr-2" />
                                            Начать прием / Карта пациента
                                        </button>
                                        <button onClick={handleCreateOrder} className="btn btn-secondary w-full justify-center">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Сделать заказ
                                        </button>
                                    </div>
                                    
                                    {selectedAppointment.status === 'scheduled' && (
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={() => updateStatus(selectedAppointment.id, 'completed')} className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100">
                                                Завершить
                                            </button>
                                            <button onClick={() => updateStatus(selectedAppointment.id, 'cancelled')} className="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-medium hover:bg-red-100">
                                                Отменить
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleCreateAppointment} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                                            <input type="date" required value={newApptDate} onChange={e => setNewApptDate(e.target.value)} className="input w-full" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                                            <input type="time" required value={newApptTime} onChange={e => setNewApptTime(e.target.value)} className="input w-full" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Поиск или имя пациента</label>
                                        
                                        {selectedPatient ? (
                                            <div className="flex items-center justify-between p-2.5 border border-primary-200 bg-primary-50 rounded-lg">
                                                <div>
                                                    <div className="font-medium text-primary-900">{selectedPatient.name}</div>
                                                    <div className="text-xs text-primary-700">{selectedPatient.phone}</div>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        setSelectedPatient(null);
                                                        setPatientSearchQuery(selectedPatient.name);
                                                    }}
                                                    className="p-1 hover:bg-primary-100 rounded-md text-primary-600"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={patientSearchQuery} 
                                                    onChange={e => setPatientSearchQuery(e.target.value)} 
                                                    className="input w-full" 
                                                    placeholder="Начните вводить имя или телефон..." 
                                                />
                                                {/* Dropdown for search results */}
                                                {patientSearchQuery.length > 0 && !selectedPatient && (
                                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                        {isSearchingPatient ? (
                                                            <div className="p-3 text-sm text-center text-gray-500">Поиск...</div>
                                                        ) : patientSearchResults.length > 0 ? (
                                                            patientSearchResults.map(p => (
                                                                <div 
                                                                    key={p.id} 
                                                                    onClick={() => {
                                                                        setSelectedPatient(p);
                                                                        setPatientSearchQuery('');
                                                                    }}
                                                                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                                >
                                                                    <div className="font-medium text-gray-900">{p.name}</div>
                                                                    <div className="text-sm text-gray-500">{p.phone}</div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-3 text-sm text-gray-500 bg-gray-50">
                                                                Пациент не найден. Будет создана новая запись для: <span className="font-medium text-gray-900">{patientSearchQuery}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {!selectedPatient && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон нового пациента</label>
                                            <input type="tel" required={!selectedPatient} value={newApptPhone} onChange={e => setNewApptPhone(e.target.value)} className="input w-full" placeholder="+7..." />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Тип приема</label>
                                            <select value={newApptType} onChange={e => setNewApptType(e.target.value)} className="input w-full">
                                                {Object.entries(APPT_TYPES).map(([val, label]) => (
                                                    <option key={val} value={val}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Длительность (мин)</label>
                                            <input type="number" required min="15" step="15" value={newApptDuration} onChange={e => setNewApptDuration(parseInt(e.target.value))} className="input w-full" />
                                        </div>
                                    </div>
                                    {(session?.user as any)?.subRole === 'optic_manager' && doctors.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Доктор (необязательно)</label>
                                            <select value={newApptDoctorId} onChange={e => setNewApptDoctorId(e.target.value)} className="input w-full">
                                                <option value="">Выберите доктора</option>
                                                {doctors.map(d => (
                                                    <option key={d.id} value={d.id}>{d.fullName}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn btn-secondary">Отмена</button>
                                        <button type="submit" className="flex-1 btn btn-primary">Создать</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
