'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User, Building2, Truck, FileText, Eye } from 'lucide-react';
import Link from 'next/link';

interface OrderData {
    order_id: string;
    meta: { optic_id: string; optic_name: string; doctor: string; created_at: string };
    patient: { name: string; phone: string; email?: string; notes?: string };
    config: any;
    company?: string;
    inn?: string;
    delivery_method?: string;
    delivery_address?: string;
    doctor_email?: string;
    status: string;
    is_urgent: boolean;
    edit_deadline?: string;
    notes?: string;
}

const CharacteristicLabels: Record<string, string> = {
    'standard': 'Стандарт',
    'toric': 'Торик',
    'multifocal': 'Мультифокал',
    'scleral': 'Склеральная',
    'ortho-k': 'Орто-К',
    'rgp': 'ЖКЛ',
};

const CharacteristicOptions = [
    { value: 'standard', label: 'Стандарт' },
    { value: 'toric', label: 'Торик' },
    { value: 'multifocal', label: 'Мультифокал' },
    { value: 'scleral', label: 'Склеральная' },
    { value: 'ortho-k', label: 'Орто-К' },
    { value: 'rgp', label: 'ЖКЛ (RGP)' },
];

const ColorOptions = [
    '', 'Голубой', 'Зелёный', 'Светло-голубой', 'Тёмно-синий',
    'Серый', 'Коричневый', 'Фиолетовый',
];

const DkOptions = [50, 75, 100, 125];

export default function EditOrderPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const orderId = params.id as string;

    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Editable fields
    const [patientName, setPatientName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [patientEmail, setPatientEmail] = useState('');
    const [company, setCompany] = useState('');
    const [inn, setInn] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [doctorEmail, setDoctorEmail] = useState('');
    const [notes, setNotes] = useState('');
    const [config, setConfig] = useState<any>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                if (!res.ok) {
                    setError(res.status === 404 ? 'Заказ не найден' : 'Ошибка загрузки заказа');
                    return;
                }
                const data: OrderData = await res.json();
                setOrder(data);

                // Pre-fill editable fields
                setPatientName(data.patient?.name || '');
                setPatientPhone(data.patient?.phone || '');
                setPatientEmail(data.patient?.email || '');
                setCompany(data.company || '');
                setInn(data.inn || '');
                setDeliveryMethod(data.delivery_method || '');
                setDeliveryAddress(data.delivery_address || '');
                setDoctorEmail(data.doctor_email || '');
                setNotes(data.notes || '');
                setConfig(data.config);

                // Check editability
                if (data.status !== 'new') {
                    setError('Заказ уже нельзя редактировать — он в обработке');
                }
                // For urgent orders, check the edit deadline
                if (data.is_urgent && data.edit_deadline && new Date() >= new Date(data.edit_deadline)) {
                    setError('Время редактирования истекло');
                }
            } catch {
                setError('Ошибка сети');
            } finally {
                setLoading(false);
            }
        })();
    }, [orderId]);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient: { name: patientName, phone: patientPhone, email: patientEmail || undefined },
                    company,
                    inn,
                    delivery_method: deliveryMethod,
                    delivery_address: deliveryAddress,
                    notes: notes || undefined,
                    config,
                }),
            });
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => router.push('/optic/dashboard'), 1500);
            } else {
                const data = await res.json();
                setError(data.error || 'Ошибка сохранения');
            }
        } catch {
            setError('Ошибка сети');
        } finally {
            setSaving(false);
        }
    };

    const updateEyeField = (eye: 'od' | 'os', field: string, value: any) => {
        setConfig((prev: any) => ({
            ...prev,
            eyes: {
                ...prev.eyes,
                [eye]: { ...prev.eyes[eye], [field]: value },
            },
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-400">
                Загрузка заказа...
            </div>
        );
    }

    if (!order || (error && !config)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-500 text-lg">{error || 'Заказ не найден'}</p>
                <Link href="/optic/dashboard" className="text-blue-600 hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Назад к заказам
                </Link>
            </div>
        );
    }

    // Non-urgent orders: always editable while status is 'new'
    // Urgent orders: editable only within the edit deadline
    const isEditable = order.status === 'new' && (
        !order.is_urgent || !order.edit_deadline || new Date() < new Date(order.edit_deadline)
    );

    const renderEyeEditor = (eye: 'od' | 'os', label: string) => {
        const eyeData = config?.eyes?.[eye];
        if (!eyeData || !eyeData.qty || Number(eyeData.qty) === 0) return null;

        return (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> {label}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Qty */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Кол-во</label>
                        <input
                            type="number"
                            min={0}
                            max={10}
                            value={eyeData.qty || 0}
                            onChange={e => updateEyeField(eye, 'qty', Number(e.target.value))}
                            className="input text-sm"
                            disabled={!isEditable}
                        />
                    </div>

                    {/* Characteristic (type) - now editable as dropdown */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Тип</label>
                        <select
                            value={eyeData.characteristic || ''}
                            onChange={e => updateEyeField(eye, 'characteristic', e.target.value)}
                            className="input text-sm"
                            disabled={!isEditable}
                        >
                            <option value="">—</option>
                            {CharacteristicOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* KM */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">KM</label>
                        <input
                            type="text"
                            value={eyeData.km ?? ''}
                            onChange={e => updateEyeField(eye, 'km', e.target.value)}
                            className="input text-sm"
                            disabled={!isEditable}
                        />
                    </div>

                    {/* TP */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">TP</label>
                        <input
                            type="text"
                            value={eyeData.tp ?? ''}
                            onChange={e => updateEyeField(eye, 'tp', e.target.value)}
                            className="input text-sm"
                            disabled={!isEditable}
                        />
                    </div>

                    {/* DIA */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">DIA</label>
                        <input
                            type="text"
                            value={eyeData.dia ?? ''}
                            onChange={e => updateEyeField(eye, 'dia', e.target.value)}
                            className="input text-sm"
                            disabled={!isEditable}
                        />
                    </div>

                    {/* E1 / E2 */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">E1</label>
                        <input
                            type="text"
                            value={eyeData.e1 ?? ''}
                            onChange={e => updateEyeField(eye, 'e1', e.target.value)}
                            className="input text-sm"
                            disabled={!isEditable}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">E2</label>
                        <input
                            type="text"
                            value={eyeData.e2 ?? ''}
                            onChange={e => updateEyeField(eye, 'e2', e.target.value)}
                            className="input text-sm"
                            disabled={!isEditable}
                        />
                    </div>

                    {/* Tor */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Тор.</label>
                        <input
                            type="text"
                            value={eyeData.tor ?? ''}
                            onChange={e => updateEyeField(eye, 'tor', e.target.value)}
                            className="input text-sm"
                            disabled={!isEditable}
                        />
                    </div>

                    {/* Trial */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Пробная</label>
                        <select
                            value={eyeData.trial ? 'yes' : 'no'}
                            onChange={e => updateEyeField(eye, 'trial', e.target.value === 'yes')}
                            className="input text-sm"
                            disabled={!isEditable}
                        >
                            <option value="no">Нет</option>
                            <option value="yes">Да</option>
                        </select>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Цвет</label>
                        <select
                            value={eyeData.color || ''}
                            onChange={e => updateEyeField(eye, 'color', e.target.value)}
                            className="input text-sm"
                            disabled={!isEditable}
                        >
                            <option value="">—</option>
                            {ColorOptions.filter(Boolean).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Dk */}
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Dk</label>
                        <select
                            value={eyeData.dk ?? ''}
                            onChange={e => updateEyeField(eye, 'dk', e.target.value ? Number(e.target.value) : undefined)}
                            className="input text-sm"
                            disabled={!isEditable}
                        >
                            <option value="">—</option>
                            {DkOptions.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    {/* Additional fields: sph, cyl, ax, add, bc */}
                    {['sph', 'cyl', 'ax', 'add', 'bc'].map(field => {
                        if (eyeData[field] === undefined && eyeData[field] !== '') return null;
                        return (
                            <div key={field}>
                                <label className="block text-xs text-gray-500 mb-1">{field.toUpperCase()}</label>
                                <input
                                    type="text"
                                    value={eyeData[field] || ''}
                                    onChange={e => updateEyeField(eye, field, e.target.value)}
                                    className="input text-sm"
                                    disabled={!isEditable}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/optic/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Редактирование заказа</h1>
                            <p className="text-sm text-gray-500">{order.order_id}</p>
                        </div>
                    </div>
                    {isEditable && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm"
                    >
                        ✅ Заказ успешно обновлён. Перенаправление...
                    </motion.div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {!isEditable && !error && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm">
                        Заказ нельзя редактировать
                    </div>
                )}

                {/* Patient */}
                <div className="card p-5 space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" /> Пациент
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ФИО пациента</label>
                            <input
                                type="text"
                                value={patientName}
                                onChange={e => setPatientName(e.target.value)}
                                className="input"
                                disabled={!isEditable}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                            <input
                                type="tel"
                                value={patientPhone}
                                onChange={e => setPatientPhone(e.target.value)}
                                className="input"
                                disabled={!isEditable}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={patientEmail}
                                onChange={e => setPatientEmail(e.target.value)}
                                className="input"
                                disabled={!isEditable}
                            />
                        </div>
                    </div>
                </div>

                {/* Lens Config */}
                {config && (
                    <div className="card p-5 space-y-4">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Eye className="w-4 h-4 text-blue-500" /> Параметры линз
                        </h3>
                        {renderEyeEditor('od', 'Правый глаз (OD)')}
                        {renderEyeEditor('os', 'Левый глаз (OS)')}
                    </div>
                )}

                {/* Company */}
                <div className="card p-5 space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500" /> Компания
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                            <input
                                type="text"
                                value={company}
                                onChange={e => setCompany(e.target.value)}
                                className="input"
                                disabled={!isEditable}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ИИН/БИН</label>
                            <input
                                type="text"
                                value={inn}
                                onChange={e => setInn(e.target.value)}
                                className="input"
                                disabled={!isEditable}
                            />
                        </div>
                    </div>
                </div>

                {/* Delivery */}
                <div className="card p-5 space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-500" /> Доставка
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Способ доставки</label>
                            <select
                                value={deliveryMethod}
                                onChange={e => setDeliveryMethod(e.target.value)}
                                className="input"
                                disabled={!isEditable}
                            >
                                <option value="">Не указан</option>
                                <option value="pickup">Самовывоз</option>
                                <option value="delivery">Доставка</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Адрес доставки</label>
                            <input
                                type="text"
                                value={deliveryAddress}
                                onChange={e => setDeliveryAddress(e.target.value)}
                                className="input"
                                disabled={!isEditable}
                            />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="card p-5 space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" /> Примечания
                    </h3>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="input min-h-[80px]"
                        placeholder="Дополнительные заметки к заказу..."
                        disabled={!isEditable}
                    />
                </div>

                {/* Bottom save button */}
                {isEditable && (
                    <div className="flex justify-end gap-3 pb-8">
                        <Link href="/optic/dashboard" className="btn btn-secondary">
                            Отмена
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Сохранение...' : 'Сохранить изменения'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
