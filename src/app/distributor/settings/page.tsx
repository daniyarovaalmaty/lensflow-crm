'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Building2, CreditCard, User, AlertTriangle, CheckCircle, Database } from 'lucide-react';

interface Lab {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    address: string | null;
}

interface DistSettings {
    id: string;
    name: string;
    inn: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    actualAddress: string | null;
    deliveryAddress: string | null;
    bankName: string | null;
    bik: string | null;
    iban: string | null;
    directorName: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
    defaultLabId: string | null;
    defaultLab: Lab | null;
}

export default function DistributorSettingsPage() {
    const { data: session } = useSession();
    const [settings, setSettings] = useState<DistSettings | null>(null);
    const [labs, setLabs] = useState<Lab[]>([]);
    const [selectedLabId, setSelectedLabId] = useState<string>('');
    
    // Form fields
    const [formData, setFormData] = useState<Partial<DistSettings>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('/api/distributors/settings').then(r => r.json()),
            fetch('/api/laboratories').then(r => r.json()),
        ]).then(([settingsData, labsData]) => {
            setSettings(settingsData);
            setSelectedLabId(settingsData.defaultLabId || '');
            setFormData(settingsData);
            setLabs(labsData);
        }).catch(() => setError('Ошибка загрузки данных'))
          .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const res = await fetch('/api/distributors/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, defaultLabId: selectedLabId || null }),
            });
            if (!res.ok) throw new Error('Ошибка сохранения');
            const updated = await res.json();
            setSettings(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e: any) {
            setError(e.message || 'Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse mx-auto mb-4" />
                    <p className="text-gray-500">Загрузка настроек...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Настройки профиля</h1>
                        <p className="text-sm text-gray-500">{settings?.name || 'Дистрибьютор'}</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {/* Settings Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                    {/* Basic Info Section */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">Основная информация</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Данные о вашей компании</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Название компании</label>
                                <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="input" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ИИН/БИН</label>
                                    <input type="text" name="inn" value={formData.inn || ''} onChange={handleInputChange} className="input" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                                    <input type="text" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="input" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="input" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Юридический адрес</label>
                                <input type="text" name="address" value={formData.address || ''} onChange={handleInputChange} className="input" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Фактический адрес</label>
                                <input type="text" name="actualAddress" value={formData.actualAddress || ''} onChange={handleInputChange} className="input" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                                <input type="text" name="city" value={formData.city || ''} onChange={handleInputChange} className="input" />
                            </div>
                        </div>
                    </div>

                    {/* Bank Info Section */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">Банковские реквизиты</h2>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Название банка</label>
                                    <input type="text" name="bankName" value={formData.bankName || ''} onChange={handleInputChange} className="input" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">БИК</label>
                                    <input type="text" name="bik" value={formData.bik || ''} onChange={handleInputChange} className="input" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">IBAN (Расчетный счет)</label>
                                <input type="text" name="iban" value={formData.iban || ''} onChange={handleInputChange} className="input" />
                            </div>
                        </div>
                    </div>

                    {/* Contact Persons Section */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">Контактные лица</h2>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ФИО Руководителя</label>
                                <input type="text" name="directorName" value={formData.directorName || ''} onChange={handleInputChange} className="input" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Контактное лицо (Менеджер)</label>
                                    <input type="text" name="contactPerson" value={formData.contactPerson || ''} onChange={handleInputChange} className="input" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Телефон контактного лица</label>
                                    <input type="text" name="contactPhone" value={formData.contactPhone || ''} onChange={handleInputChange} className="input" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Laboratory Linking Section */}
                    <div className="p-6">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">Связь с Лабораторией</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Выберите лабораторию для перенаправления заказов по умолчанию</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Лаборатория-партнер</label>
                                <select 
                                    value={selectedLabId} 
                                    onChange={e => setSelectedLabId(e.target.value)}
                                    className="input"
                                >
                                    <option value="">Не выбрано</option>
                                    {labs.map(lab => (
                                        <option key={lab.id} value={lab.id}>{lab.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : saved ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : null}
                        {saved ? 'Сохранено' : 'Сохранить изменения'}
                    </button>
                </div>
            </div>
        </div>
    );
}
