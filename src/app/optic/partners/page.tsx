'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Building2, Save, Loader2, Tag, Percent } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OpticPartnersPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orgData, setOrgData] = useState<any>(null);
    const [laboratories, setLaboratories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedLabId, setSelectedLabId] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/optic/partner');
                if (!res.ok) throw new Error('Failed to load data');
                const data = await res.json();
                setOrgData(data.organization);
                setLaboratories(data.laboratories);
                setProducts(data.products);
                setSelectedLabId(data.organization?.defaultLabId || '');
            } catch (error) {
                console.error(error);
                toast.error('Ошибка загрузки данных');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/optic/partner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labId: selectedLabId })
            });
            if (!res.ok) throw new Error('Failed to save');
            toast.success('Настройки успешно сохранены');
        } catch (error) {
            console.error(error);
            toast.error('Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    const discount = orgData?.discountPercent || 0;

    return (
        <div className="min-h-screen bg-surface p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Партнеры и Поставщики</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Выберите лабораторию, с которой вы работаете, и просмотрите прайс-лист с вашей скидкой.
                    </p>
                </div>

                {/* Partner Selection Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Лаборатория</h2>
                            <p className="text-xs text-gray-500">Куда будут по умолчанию направляться заказы врачей</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Выберите партнера</label>
                            <select
                                value={selectedLabId}
                                onChange={(e) => setSelectedLabId(e.target.value)}
                                className="input w-full bg-white"
                            >
                                <option value="">-- Не выбрано --</option>
                                {laboratories.map(lab => (
                                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving || selectedLabId === orgData?.defaultLabId}
                            className="btn btn-primary w-full sm:w-auto min-w-[140px]"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Сохранить
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Price List Card */}
                {selectedLabId && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="card p-6"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                                    <Tag className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Каталог услуг и цены</h2>
                                    <p className="text-xs text-gray-500">Прайс-лист выбранной лаборатории</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200">
                                <Percent className="w-4 h-4" />
                                <span className="text-sm font-semibold">Ваша скидка: {discount}%</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Услуга / Товар</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Категория</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Базовая цена</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ваша цена</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product, idx) => {
                                        const finalPrice = product.price * (1 - discount / 100);
                                        return (
                                            <tr key={product.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-gray-900">{product.name}</div>
                                                    {product.sku && <div className="text-xs text-gray-500 mt-0.5">Арт: {product.sku}</div>}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600">
                                                    {product.category === 'lens' ? 'Линзы' : product.category}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500 text-right line-through">
                                                    {product.price.toLocaleString('ru-RU')} ₸
                                                </td>
                                                <td className="py-3 px-4 text-sm font-semibold text-green-600 text-right">
                                                    {finalPrice.toLocaleString('ru-RU')} ₸
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {products.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                                                В каталоге пока нет услуг
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
