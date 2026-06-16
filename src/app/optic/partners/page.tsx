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
    const [contracts, setContracts] = useState<any[]>([]);
    const [selectedLabId, setSelectedLabId] = useState<string>('');
    const [newContractNumber, setNewContractNumber] = useState('');
    const [newContractDate, setNewContractDate] = useState('');
    const [newContractLab, setNewContractLab] = useState('');
    const [creatingContract, setCreatingContract] = useState(false);

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

                const cRes = await fetch('/api/optic/contracts');
                if (cRes.ok) {
                    setContracts(await cRes.json());
                }
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

                {/* Contracts Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card p-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                            <Tag className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Договора</h2>
                            <p className="text-xs text-gray-500">Ваши договора с лабораториями</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto mb-6">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Номер договора</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Дата</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Поставщик</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contracts.map((c) => (
                                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-gray-900">{c.number}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600">{new Date(c.date).toLocaleDateString('ru-RU')}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600">{c.provider?.name || '—'}</td>
                                    </tr>
                                ))}
                                {contracts.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-gray-500 text-sm">Нет добавленных договоров</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Добавить договор</h3>
                        <div className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Лаборатория</label>
                                <select value={newContractLab} onChange={e => setNewContractLab(e.target.value)} className="input text-sm w-full bg-white">
                                    <option value="">Выберите...</option>
                                    {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
                                </select>
                            </div>
                            <div className="w-full sm:w-32">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Номер</label>
                                <input type="text" value={newContractNumber} onChange={e => setNewContractNumber(e.target.value)} className="input text-sm w-full" placeholder="№..." />
                            </div>
                            <div className="w-full sm:w-40">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Дата</label>
                                <input type="date" value={newContractDate} onChange={e => setNewContractDate(e.target.value)} className="input text-sm w-full" />
                            </div>
                            <button
                                onClick={async () => {
                                    if (!newContractLab || !newContractNumber || !newContractDate) return toast.error('Заполните все поля');
                                    setCreatingContract(true);
                                    try {
                                        const res = await fetch('/api/optic/contracts', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ providerId: newContractLab, number: newContractNumber, date: newContractDate })
                                        });
                                        if (res.ok) {
                                            toast.success('Договор добавлен');
                                            const cRes = await fetch('/api/optic/contracts');
                                            setContracts(await cRes.json());
                                            setNewContractNumber('');
                                            setNewContractDate('');
                                        } else {
                                            toast.error('Ошибка добавления');
                                        }
                                    } finally { setCreatingContract(false); }
                                }}
                                disabled={creatingContract}
                                className="btn btn-primary text-sm px-4 whitespace-nowrap"
                            >
                                Добавить
                            </button>
                        </div>
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
