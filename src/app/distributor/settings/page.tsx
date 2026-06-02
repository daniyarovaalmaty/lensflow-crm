'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Settings, FlaskConical, CheckCircle, AlertCircle, ChevronDown, Building2, Phone, Mail, MapPin, Save } from 'lucide-react';

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
    defaultLabId: string | null;
    defaultLab: Lab | null;
}

export default function DistributorSettingsPage() {
    const { data: session } = useSession();
    const [settings, setSettings] = useState<DistSettings | null>(null);
    const [labs, setLabs] = useState<Lab[]>([]);
    const [selectedLabId, setSelectedLabId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/distributors/settings').then(r => r.json()),
            fetch('/api/labs').then(r => r.json()),
        ]).then(([settingsData, labsData]) => {
            setSettings(settingsData);
            setSelectedLabId(settingsData.defaultLabId || '');
            setLabs(labsData);
        }).catch(() => setError('Ошибка загрузки данных'))
          .finally(() => setLoading(false));
    }, []);

    const selectedLab = labs.find(l => l.id === selectedLabId) || null;

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const res = await fetch('/api/distributors/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ defaultLabId: selectedLabId || null }),
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">Настройки</h1>
                            <p className="text-sm text-gray-500">{settings?.name}</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {/* Default Lab Card */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
                >
                    {/* Card Header */}
                    <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                                <FlaskConical className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-extrabold text-gray-900">Лаборатория по умолчанию</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Заказы будут автоматически отправляться в эту лабораторию</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Current lab badge */}
                        {settings?.defaultLab && (
                            <div className="mb-5 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-indigo-900">Текущая лаборатория</p>
                                    <p className="text-xs text-indigo-600 mt-0.5">{settings.defaultLab.name}</p>
                                </div>
                            </div>
                        )}

                        {/* Lab selector */}
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Выберите лабораторию
                        </label>

                        {labs.length === 0 ? (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700 font-medium">
                                ⚠️ Лаборатории не найдены в системе. Обратитесь к администратору.
                            </div>
                        ) : (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-left hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span className={`text-sm font-medium ${selectedLabId ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {selectedLab?.name || '— Не выбрана —'}
                                        </span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showDropdown && (
                                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden">
                                        {/* No lab option */}
                                        <button
                                            onClick={() => { setSelectedLabId(''); setShowDropdown(false); }}
                                            className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 ${!selectedLabId ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500'}`}
                                        >
                                            — Не выбрана —
                                        </button>

                                        {labs.map(lab => (
                                            <button
                                                key={lab.id}
                                                onClick={() => { setSelectedLabId(lab.id); setShowDropdown(false); }}
                                                className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-indigo-50 border-t border-gray-50 ${selectedLabId === lab.id ? 'bg-indigo-50' : ''}`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className={`text-sm font-bold ${selectedLabId === lab.id ? 'text-indigo-700' : 'text-gray-900'}`}>
                                                            {lab.name}
                                                            {selectedLabId === lab.id && <CheckCircle className="inline w-3.5 h-3.5 ml-1.5 text-indigo-500" />}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                            {lab.city && (
                                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                    <MapPin className="w-3 h-3" />{lab.city}
                                                                </span>
                                                            )}
                                                            {lab.phone && (
                                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                    <Phone className="w-3 h-3" />{lab.phone}
                                                                </span>
                                                            )}
                                                            {lab.email && (
                                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                                    <Mail className="w-3 h-3" />{lab.email}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selected lab info */}
                        {selectedLab && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2"
                            >
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Выбрана лаборатория:</p>
                                <p className="text-sm font-extrabold text-gray-900">{selectedLab.name}</p>
                                <div className="flex flex-wrap gap-3">
                                    {selectedLab.city && (
                                        <span className="flex items-center gap-1.5 text-xs text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-100">
                                            <MapPin className="w-3 h-3 text-indigo-500" />{selectedLab.city}
                                        </span>
                                    )}
                                    {selectedLab.phone && (
                                        <span className="flex items-center gap-1.5 text-xs text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-100">
                                            <Phone className="w-3 h-3 text-indigo-500" />{selectedLab.phone}
                                        </span>
                                    )}
                                    {selectedLab.email && (
                                        <span className="flex items-center gap-1.5 text-xs text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-100">
                                            <Mail className="w-3 h-3 text-indigo-500" />{selectedLab.email}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Save button */}
                        <div className="mt-6 flex items-center gap-3">
                            <button
                                onClick={handleSave}
                                disabled={saving || selectedLabId === (settings?.defaultLabId || '')}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-md shadow-indigo-100"
                            >
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>

                            {saved && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-1.5 text-sm font-bold text-green-600"
                                >
                                    <CheckCircle className="w-4 h-4" /> Сохранено!
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Info card */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl"
                >
                    <p className="text-sm font-bold text-blue-800 mb-1">💡 Как это работает</p>
                    <ul className="text-xs text-blue-700 space-y-1.5 leading-relaxed">
                        <li>• Выберите лабораторию по умолчанию — она будет подставляться автоматически при отправке заказов</li>
                        <li>• При отправке конкретного заказа вы всегда сможете выбрать другую лабораторию</li>
                        <li>• Лаборатория увидит заказ у себя в системе и начнёт производство</li>
                    </ul>
                </motion.div>
            </div>
        </div>
    );
}
