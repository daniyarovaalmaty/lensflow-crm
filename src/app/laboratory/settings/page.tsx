'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Save, Percent, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import type { SubRole } from '@/types/user';

export default function LabSettingsPage() {
    const { data: session } = useSession();
    const subRole = (session?.user?.subRole || 'lab_admin') as SubRole;

    const [surcharge, setSurcharge] = useState(25);
    const [discount, setDiscount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                setSurcharge(data.urgentSurchargePercent ?? 25);
                setDiscount(data.urgentDiscountPercent ?? 0);
            })
            .catch(() => setError('Не удалось загрузить настройки'))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setError('');
        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    urgentSurchargePercent: surcharge,
                    urgentDiscountPercent: discount,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Ошибка сохранения');
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    const canEdit = subRole === 'lab_head' || subRole === 'lab_admin';

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
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Настройки лаборатории</h1>
                        <p className="text-sm text-gray-500">Управление наценками и скидками</p>
                    </div>
                </div>

                {/* Settings card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Surcharge section */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">Наценка за срочность</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Процент наценки на срочные заказы. Применяется автоматически при создании заказа.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={surcharge}
                                onChange={e => setSurcharge(Number(e.target.value))}
                                disabled={!canEdit}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 min-w-[80px] justify-center">
                                <span className="text-lg font-bold text-amber-700">{surcharge}</span>
                                <Percent className="w-4 h-4 text-amber-500" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            {[0, 10, 15, 20, 25, 30, 50].map(v => (
                                <button
                                    key={v}
                                    onClick={() => canEdit && setSurcharge(v)}
                                    disabled={!canEdit}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${surcharge === v
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
                                        }`}
                                >
                                    {v}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Discount section */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <Percent className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">Постоянная скидка на срочные</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Скидка от наценки на срочность. Например, при наценке 25% и скидке 10%, итого наценка = 15%.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={discount}
                                onChange={e => setDiscount(Number(e.target.value))}
                                disabled={!canEdit}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 min-w-[80px] justify-center">
                                <span className="text-lg font-bold text-emerald-700">{discount}</span>
                                <Percent className="w-4 h-4 text-emerald-500" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            {[0, 5, 10, 15, 20, 25, 50].map(v => (
                                <button
                                    key={v}
                                    onClick={() => canEdit && setDiscount(v)}
                                    disabled={!canEdit}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${discount === v
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'
                                        }`}
                                >
                                    {v}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-6 bg-gray-50">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Предпросмотр</h3>
                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Базовая стоимость заказа</span>
                                <span className="font-medium">100 000 ₸</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Наценка за срочность ({surcharge}%)</span>
                                <span className="font-medium text-amber-600">+{(100000 * surcharge / 100).toLocaleString('ru-RU')} ₸</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Скидка ({discount}%)</span>
                                    <span className="font-medium text-emerald-600">-{(100000 * discount / 100).toLocaleString('ru-RU')} ₸</span>
                                </div>
                            )}
                            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                                <span className="text-gray-900">Итого (срочный)</span>
                                <span className="text-gray-900">
                                    {(100000 + 100000 * surcharge / 100 - 100000 * discount / 100).toLocaleString('ru-RU')} ₸
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {canEdit && (
                        <div className="p-6 border-t border-gray-200">
                            {error && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}
                            {saved && (
                                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-3 mb-4">
                                    <CheckCircle className="w-4 h-4 shrink-0" />
                                    Настройки успешно сохранены
                                </div>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Сохранение...' : 'Сохранить настройки'}
                            </button>
                        </div>
                    )}

                    {!canEdit && (
                        <div className="p-6 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                Только руководитель лаборатории может изменять настройки
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
