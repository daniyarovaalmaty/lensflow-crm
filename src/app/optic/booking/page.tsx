'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QuickNav from '@/components/ui/QuickNav';
import { CalendarPlus, Loader2, Check, Search, Clock, User, Stethoscope, Building2, AlertTriangle } from 'lucide-react';

interface Dept { id: number | string; name: string; }
interface Service { id: number | string; name: string; price?: number; }
interface Slot { time: string; userId: number | string; username?: string; departmentName?: string; }

export default function BookingPage() {
    const [notConfigured, setNotConfigured] = useState(false);
    const [loading, setLoading] = useState(true);
    const [depts, setDepts] = useState<Dept[]>([]);
    const [services, setServices] = useState<Service[]>([]);

    const [departmentId, setDepartmentId] = useState('');
    const [serviceTypeId, setServiceTypeId] = useState('');
    const [date, setDate] = useState('');
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slot, setSlot] = useState<Slot | null>(null);

    const [tel, setTel] = useState('');
    const [family, setFamily] = useState('');
    const [first, setFirst] = useState('');
    const [clientId, setClientId] = useState<string | null>(null);
    const [findingClient, setFindingClient] = useState(false);

    const [booking, setBooking] = useState(false);
    const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
    const flash = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 4000); };

    useEffect(() => {
        Promise.all([
            fetch('/api/optic/itigris-booking?action=departments').then(r => r.json()),
            fetch('/api/optic/itigris-booking?action=services').then(r => r.json()),
        ]).then(([d, s]) => {
            if (d?.notConfigured || s?.notConfigured) { setNotConfigured(true); return; }
            setDepts(Array.isArray(d.items) ? d.items : []);
            setServices(Array.isArray(s.items) ? s.items : []);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const loadSlots = async () => {
        if (!departmentId || !date) return;
        setLoadingSlots(true); setSlot(null); setSlots([]);
        try {
            const d = await fetch(`/api/optic/itigris-booking?action=slots&departmentId=${departmentId}&date=${date}`).then(r => r.json());
            setSlots(Array.isArray(d.items) ? d.items : []);
            if (!d.items?.length) flash(false, 'Свободных слотов нет (проверьте табель в Оптиме)');
        } catch { flash(false, 'Не удалось загрузить слоты'); }
        setLoadingSlots(false);
    };

    const findClient = async () => {
        if (!tel) return;
        setFindingClient(true); setClientId(null);
        try {
            const d = await fetch(`/api/optic/itigris-booking?action=findClient&tel=${encodeURIComponent(tel)}&family=${encodeURIComponent(family)}&first=${encodeURIComponent(first)}`).then(r => r.json());
            const v = String(d.clientId ?? '').trim();
            if (/^\d{5,}$/.test(v)) { setClientId(v); flash(true, `Клиент найден: ${v}`); }
            else flash(false, `Клиент не найден${v ? ': ' + v : ''}`);
        } catch { flash(false, 'Ошибка поиска клиента'); }
        setFindingClient(false);
    };

    const buildTime = (slotTime: string) => {
        if (/\d{4}-\d{2}-\d{2}T/.test(slotTime)) return slotTime;            // already full ISO
        if (/^\d{2}:\d{2}/.test(slotTime)) return `${date}T${slotTime.length === 5 ? slotTime + ':00' : slotTime}`; // hh:mm[:ss]
        return slotTime;
    };

    const submit = async () => {
        if (!slot || !clientId || !serviceTypeId) return;
        setBooking(true);
        try {
            const res = await fetch('/api/optic/itigris-booking', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId, userId: slot.userId, time: buildTime(slot.time), serviceTypeId }),
            });
            const d = await res.json();
            if (res.ok && d.ok) { flash(true, 'Запись создана в Оптиме'); setSlot(null); loadSlots(); }
            else flash(false, d.error || `Не удалось записать${d.result ? ': ' + d.result : ''}`);
        } catch { flash(false, 'Ошибка записи'); }
        setBooking(false);
    };

    const inputCls = 'w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm';

    return (
        <div className="min-h-screen bg-gray-50">
            <QuickNav />
            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm"><CalendarPlus className="w-6 h-6 text-white" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Запись на приём</h1>
                        <p className="text-sm text-gray-500">Создаётся напрямую в Оптиме (Itigris)</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-300 mx-auto" /></div>
                ) : notConfigured ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                        <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
                        <p className="font-semibold text-amber-800">Нужен RemoteAPI-ключ</p>
                        <p className="text-sm text-amber-700 mt-1">Запись на приём работает через RemoteAPI Оптимы. Добавьте ключ в настройках интеграции.</p>
                        <Link href="/clinic-manager/itigris" className="inline-block mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold">Настройки ITIGRIS →</Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Service + department + date */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" /> Услуга</label>
                                <select value={serviceTypeId} onChange={e => setServiceTypeId(e.target.value)} className={inputCls}>
                                    <option value="">— выбрать услугу —</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name}{s.price ? ` — ${s.price} ₸` : ''}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Филиал</label>
                                    <select value={departmentId} onChange={e => { setDepartmentId(e.target.value); setSlots([]); setSlot(null); }} className={inputCls}>
                                        <option value="">— филиал —</option>
                                        {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 uppercase">Дата</label>
                                    <input type="date" value={date} onChange={e => { setDate(e.target.value); setSlots([]); setSlot(null); }} className={inputCls} />
                                </div>
                            </div>
                            <button onClick={loadSlots} disabled={!departmentId || !date || loadingSlots} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                {loadingSlots ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} Показать свободные слоты
                            </button>
                        </div>

                        {/* Slots */}
                        {slots.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                <label className="text-xs font-semibold text-gray-400 uppercase">Свободные слоты</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                    {slots.map((s, i) => {
                                        const active = slot === s;
                                        return (
                                            <button key={i} onClick={() => setSlot(s)} className={`text-left px-3 py-2 rounded-xl border text-sm transition-colors ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 border-gray-100 hover:bg-emerald-50'}`}>
                                                <div className="font-semibold">{String(s.time).slice(11, 16) || s.time}</div>
                                                {s.username && <div className={`text-[11px] truncate ${active ? 'text-emerald-50' : 'text-gray-500'}`}>{s.username}</div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Client */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                            <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1"><User className="w-3.5 h-3.5" /> Клиент</label>
                            <div className="grid grid-cols-3 gap-2">
                                <input value={tel} onChange={e => { setTel(e.target.value); setClientId(null); }} placeholder="Телефон" className={inputCls + ' mt-0'} />
                                <input value={family} onChange={e => setFamily(e.target.value)} placeholder="Фамилия" className={inputCls + ' mt-0'} />
                                <input value={first} onChange={e => setFirst(e.target.value)} placeholder="Имя" className={inputCls + ' mt-0'} />
                            </div>
                            <button onClick={findClient} disabled={!tel || findingClient} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                {findingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Найти клиента в Оптиме
                            </button>
                            {clientId && <div className="text-sm text-emerald-700 flex items-center gap-1.5"><Check className="w-4 h-4" /> Клиент: {clientId}</div>}
                        </div>

                        <button onClick={submit} disabled={booking || !slot || !clientId || !serviceTypeId} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                            {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />} Записать на приём
                        </button>
                        <p className="text-xs text-gray-400 text-center">Нужны: услуга, слот (врач+время) и найденный клиент.</p>
                    </div>
                )}
            </main>

            {toast && <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.text}</div>}
        </div>
    );
}
