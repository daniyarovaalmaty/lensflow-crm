'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, User, Phone, Mail, Calendar, FileText, Edit2, Save, X,
    Plus, Eye, Stethoscope, ClipboardList, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import OpticNav from '@/components/layout/OpticNav';
import Link from 'next/link';

interface Prescription {
    id: string;
    odSph: number | null; odCyl: number | null; odAx: number | null; odAdd: number | null; odPd: number | null;
    osSph: number | null; osCyl: number | null; osAx: number | null; osAdd: number | null; osPd: number | null;
    pdTotal: number | null; type: string; notes: string | null; prescribedAt: string;
}

interface PatientDetail {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    birthDate: string | null;
    gender: string | null;
    notes: string | null;
    doctor: { id: string; fullName: string } | null;
    createdAt: string;
    prescriptions: Prescription[];
    orders: Array<{
        id: string; order_id: string; status: string; created_at: string;
        total_price: number | null; is_urgent: boolean; lens_type: string;
    }>;
}

const fmt = (v: number | null, plus = true) => {
    if (v == null) return '—';
    return (plus && v > 0 ? '+' : '') + v.toFixed(2);
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    new: { label: 'Новый', color: 'bg-blue-100 text-blue-700' },
    production: { label: 'В производстве', color: 'bg-amber-100 text-amber-700' },
    ready: { label: 'Готов', color: 'bg-green-100 text-green-700' },
    shipped: { label: 'Отгружен', color: 'bg-purple-100 text-purple-700' },
    cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-700' },
};

function PrescriptionCard({ rx, onDelete }: { rx: Prescription; onDelete: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const typeLabels: Record<string, string> = {
        glasses: '👓 Очки', contacts: '🔵 Контактные линзы', 'ortho-k': '🌙 Орто-К'
    };

    return (
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">{typeLabels[rx.type] || rx.type}</p>
                        <p className="text-xs text-gray-500">
                            {new Date(rx.prescribedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-right text-sm font-mono">
                        <p className="text-gray-700">OD: {fmt(rx.odSph)} {rx.odCyl ? fmt(rx.odCyl) : ''} {rx.odAx ? `${Math.round(rx.odAx)}°` : ''}</p>
                        <p className="text-gray-700">OS: {fmt(rx.osSph)} {rx.osCyl ? fmt(rx.osCyl) : ''} {rx.osAx ? `${Math.round(rx.osAx)}°` : ''}</p>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                    <div className="grid grid-cols-2 gap-6 mb-4">
                        {/* OD */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">OD (Правый)</h4>
                            <table className="w-full text-sm">
                                <tbody>
                                    {[['Sph', rx.odSph], ['Cyl', rx.odCyl], ['Ax', rx.odAx, false], ['Add', rx.odAdd], ['PD', rx.odPd, false]].map(([label, val, p = true]) => (
                                        <tr key={label as string}>
                                            <td className="text-gray-500 py-0.5 pr-3 w-10">{label}</td>
                                            <td className="font-mono font-medium text-gray-900">{fmt(val as number | null, p as boolean)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* OS */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">OS (Левый)</h4>
                            <table className="w-full text-sm">
                                <tbody>
                                    {[['Sph', rx.osSph], ['Cyl', rx.osCyl], ['Ax', rx.osAx, false], ['Add', rx.osAdd], ['PD', rx.osPd, false]].map(([label, val, p = true]) => (
                                        <tr key={label as string}>
                                            <td className="text-gray-500 py-0.5 pr-3 w-10">{label}</td>
                                            <td className="font-mono font-medium text-gray-900">{fmt(val as number | null, p as boolean)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {rx.pdTotal && <p className="text-sm text-gray-600 mb-2">PD общий: <span className="font-mono font-medium">{rx.pdTotal}</span> мм</p>}
                    {rx.notes && <p className="text-sm text-gray-600 italic">{rx.notes}</p>}
                    <div className="flex justify-end mt-3">
                        <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Удалить рецепт
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [patient, setPatient] = useState<PatientDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [showRxForm, setShowRxForm] = useState(false);
    const [rxForm, setRxForm] = useState<any>({ type: 'glasses', prescribedAt: new Date().toISOString().split('T')[0] });
    const [savingRx, setSavingRx] = useState(false);

    useEffect(() => {
        fetch(`/api/patients/${id}`)
            .then(r => r.json())
            .then(data => { setPatient(data); setEditForm(data); })
            .finally(() => setIsLoading(false));
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        const res = await fetch(`/api/patients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm),
        });
        if (res.ok) {
            const updated = await res.json();
            setPatient(p => p ? { ...p, ...updated } : p);
            setIsEditing(false);
        }
        setSaving(false);
    };

    const handleAddRx = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingRx(true);
        const res = await fetch(`/api/patients/${id}/prescriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rxForm),
        });
        if (res.ok) {
            const rx = await res.json();
            setPatient(p => p ? { ...p, prescriptions: [rx, ...p.prescriptions] } : p);
            setShowRxForm(false);
            setRxForm({ type: 'glasses', prescribedAt: new Date().toISOString().split('T')[0] });
        }
        setSavingRx(false);
    };

    const handleDeleteRx = async (rxId: string) => {
        if (!confirm('Удалить рецепт?')) return;
        await fetch(`/api/prescriptions/${rxId}`, { method: 'DELETE' });
        setPatient(p => p ? { ...p, prescriptions: p.prescriptions.filter(r => r.id !== rxId) } : p);
    };

    const calcAge = (birthDate: string | null) => {
        if (!birthDate) return '';
        const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000);
        return `${age} лет`;
    };

    if (isLoading) return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
    );

    if (!patient) return <div className="min-h-screen bg-surface flex items-center justify-center"><p className="text-gray-500">Пациент не найден</p></div>;

    const RxField = ({ label, field }: { label: string; field: string }) => (
        <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
            <input
                type="number" step="0.01"
                value={rxForm[field] ?? ''}
                onChange={e => setRxForm((f: any) => ({ ...f, [field]: e.target.value }))}
                className="input text-sm h-9 font-mono w-full"
                placeholder="0.00"
            />
        </div>
    );

    return (
        <div className="min-h-screen bg-surface">
            <OpticNav />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                {/* Back */}
                <button onClick={() => router.push('/optic/patients')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> К списку пациентов
                </button>

                {/* Header */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                            {patient.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                        </div>
                        <div className="flex-1">
                            {isEditing ? (
                                <input
                                    type="text" value={editForm.name || ''}
                                    onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                                    className="input text-xl font-bold mb-2 w-full"
                                />
                            ) : (
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">{patient.name}</h1>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                {patient.gender === 'male' && <span className="text-blue-500 font-medium">♂ Мужской</span>}
                                {patient.gender === 'female' && <span className="text-pink-500 font-medium">♀ Женский</span>}
                                {patient.birthDate && <span>{new Date(patient.birthDate).toLocaleDateString('ru-RU')} ({calcAge(patient.birthDate)})</span>}
                                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{patient.orders.length} заказов</span>
                                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{patient.prescriptions.length} рецептов</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm flex items-center gap-1"><X className="w-4 h-4" /> Отмена</button>
                                    <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm flex items-center gap-1">
                                        <Save className="w-4 h-4" /> {saving ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="btn btn-secondary btn-sm flex items-center gap-1">
                                    <Edit2 className="w-4 h-4" /> Редактировать
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Contact info */}
                    <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Телефон</label>
                            {isEditing ? (
                                <input type="tel" value={editForm.phone || ''} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} className="input w-full" />
                            ) : (
                                <p className="flex items-center gap-1.5 text-gray-900 font-medium"><Phone className="w-4 h-4 text-gray-400" />{patient.phone}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Email</label>
                            {isEditing ? (
                                <input type="email" value={editForm.email || ''} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} className="input w-full" />
                            ) : (
                                <p className="flex items-center gap-1.5 text-gray-900">{patient.email ? <><Mail className="w-4 h-4 text-gray-400" />{patient.email}</> : '—'}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Дата рождения</label>
                            {isEditing ? (
                                <input type="date" value={editForm.birthDate?.split('T')[0] || ''} onChange={e => setEditForm((f: any) => ({ ...f, birthDate: e.target.value }))} className="input w-full" />
                            ) : (
                                <p className="flex items-center gap-1.5 text-gray-900">{patient.birthDate ? <><Calendar className="w-4 h-4 text-gray-400" />{new Date(patient.birthDate).toLocaleDateString('ru-RU')}</> : '—'}</p>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    {(isEditing || patient.notes) && (
                        <div className="mt-4">
                            <label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">Заметки / Анамнез</label>
                            {isEditing ? (
                                <textarea value={editForm.notes || ''} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))} className="input w-full resize-none" rows={3} placeholder="Аллергии, особенности здоровья..." />
                            ) : (
                                <p className="text-gray-700 text-sm bg-amber-50 rounded-lg p-3 border border-amber-100">{patient.notes}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Prescriptions */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Stethoscope className="w-5 h-5 text-primary-600" /> Рецепты на зрение
                            </h2>
                            <button onClick={() => setShowRxForm(!showRxForm)} className="btn btn-primary btn-sm flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Добавить
                            </button>
                        </div>

                        {/* Rx Form */}
                        {showRxForm && (
                            <div className="bg-white rounded-xl border border-primary-200 p-4 mb-4 shadow-sm">
                                <h3 className="font-semibold text-gray-900 mb-4">Новый рецепт</h3>
                                <form onSubmit={handleAddRx}>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Тип</label>
                                            <select value={rxForm.type} onChange={e => setRxForm((f: any) => ({ ...f, type: e.target.value }))} className="input text-sm h-9 w-full">
                                                <option value="glasses">Очки</option>
                                                <option value="contacts">Контактные линзы</option>
                                                <option value="ortho-k">Орто-К</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Дата рецепта</label>
                                            <input type="date" value={rxForm.prescribedAt || ''} onChange={e => setRxForm((f: any) => ({ ...f, prescribedAt: e.target.value }))} className="input text-sm h-9 w-full" />
                                        </div>
                                    </div>
                                    {/* OD / OS grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <p className="text-xs font-bold text-gray-600 mb-2 bg-gray-100 rounded px-2 py-1">OD — Правый</p>
                                            <div className="space-y-2">
                                                <RxField label="Sph" field="odSph" />
                                                <RxField label="Cyl" field="odCyl" />
                                                <RxField label="Ax" field="odAx" />
                                                <RxField label="Add" field="odAdd" />
                                                <RxField label="PD" field="odPd" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-600 mb-2 bg-gray-100 rounded px-2 py-1">OS — Левый</p>
                                            <div className="space-y-2">
                                                <RxField label="Sph" field="osSph" />
                                                <RxField label="Cyl" field="osCyl" />
                                                <RxField label="Ax" field="osAx" />
                                                <RxField label="Add" field="osAdd" />
                                                <RxField label="PD" field="osPd" />
                                            </div>
                                        </div>
                                    </div>
                                    <RxField label="PD общий (мм)" field="pdTotal" />
                                    <div className="mt-3">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Заметки к рецепту</label>
                                        <textarea value={rxForm.notes || ''} onChange={e => setRxForm((f: any) => ({ ...f, notes: e.target.value }))} className="input w-full resize-none text-sm" rows={2} />
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button type="button" onClick={() => setShowRxForm(false)} className="btn btn-secondary flex-1 text-sm">Отмена</button>
                                        <button type="submit" disabled={savingRx} className="btn btn-primary flex-1 text-sm">
                                            {savingRx ? 'Сохранение...' : 'Сохранить рецепт'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {patient.prescriptions.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
                                <Eye className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Рецептов пока нет</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {patient.prescriptions.map(rx => (
                                    <PrescriptionCard key={rx.id} rx={rx} onDelete={() => handleDeleteRx(rx.id)} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Orders */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-primary-600" /> История заказов
                            </h2>
                            <Link href={`/optic/orders/new?patientId=${patient.id}&patientName=${encodeURIComponent(patient.name)}`} className="btn btn-secondary btn-sm flex items-center gap-1">
                                <Plus className="w-4 h-4" /> Новый заказ
                            </Link>
                        </div>
                        {patient.orders.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
                                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Заказов пока нет</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {patient.orders.map(order => {
                                    const s = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700' };
                                    return (
                                        <Link key={order.id} href={`/optic/orders/${order.id}`}
                                            className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all group">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900">{order.order_id}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                                                    {order.is_urgent && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">СРОЧНО</span>}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                                    {order.total_price ? ` · ${order.total_price.toLocaleString('ru-RU')} ₸` : ''}
                                                </p>
                                            </div>
                                            <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90 group-hover:text-primary-500 transition-colors" />
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
