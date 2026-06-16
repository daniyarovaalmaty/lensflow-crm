'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Building2, Save, Loader2, Tag, Percent, Plus, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OpticPartnersPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orgData, setOrgData] = useState<any>(null);
    const [laboratories, setLaboratories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [defaultLabId, setDefaultLabId] = useState<string>('');
    
    // Add new partner form state
    const [newContractNumber, setNewContractNumber] = useState('');
    const [newContractDate, setNewContractDate] = useState('');
    const [newContractLab, setNewContractLab] = useState('');
    const [creatingContract, setCreatingContract] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // Price list view state
    const [activeContractId, setActiveContractId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/optic/partner');
                if (!res.ok) throw new Error('Failed to load data');
                const data = await res.json();
                setOrgData(data.organization);
                setLaboratories(data.laboratories);
                setProducts(data.products);
                setDefaultLabId(data.organization?.defaultLabId || '');

                const cRes = await fetch('/api/optic/contracts');
                if (cRes.ok) {
                    const fetchedContracts = await cRes.json();
                    
                    // Add virtual contract for defaultLab if missing
                    const defaultId = data.organization?.defaultLabId;
                    if (defaultId && !fetchedContracts.some((c: any) => c.providerId === defaultId)) {
                        const defaultLab = data.laboratories.find((l: any) => l.id === defaultId);
                        fetchedContracts.unshift({
                            id: `virtual-${defaultId}`,
                            number: 'Базовый',
                            date: new Date().toISOString(),
                            providerId: defaultId,
                            provider: defaultLab || { id: defaultId, name: 'Лаборатория по умолчанию' },
                            customPrices: null
                        });
                    }
                    
                    setContracts(fetchedContracts);
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

    const handleSetDefaultLab = async (labId: string) => {
        setSaving(true);
        try {
            const res = await fetch('/api/optic/partner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labId })
            });
            if (!res.ok) throw new Error('Failed to save');
            setDefaultLabId(labId);
            toast.success('Лаборатория по умолчанию обновлена');
        } catch (error) {
            console.error(error);
            toast.error('Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    const handleAddContract = async () => {
        if (!newContractLab || !newContractNumber || !newContractDate) {
            return toast.error('Заполните все поля');
        }
        setCreatingContract(true);
        try {
            const res = await fetch('/api/optic/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ providerId: newContractLab, number: newContractNumber, date: newContractDate })
            });
            if (res.ok) {
                toast.success('Партнер добавлен');
                const cRes = await fetch('/api/optic/contracts');
                setContracts(await cRes.json());
                setNewContractNumber('');
                setNewContractDate('');
                setNewContractLab('');
                setShowAddForm(false);
            } else {
                toast.error('Ошибка добавления партнера');
            }
        } finally {
            setCreatingContract(false);
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
    const activeContract = contracts.find(c => c.id === activeContractId);

    return (
        <div className="min-h-screen bg-surface p-4 sm:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Мои Партнеры</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Управляйте лабораториями, договорами и индивидуальными прайс-листами.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить партнера
                    </button>
                </div>

                {/* Add Partner Form */}
                <AnimatePresence>
                    {showAddForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="card p-6 bg-blue-50/50 border border-blue-100 mb-6">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Новый договор с лабораторией</h3>
                                <div className="flex flex-col sm:flex-row items-end gap-4">
                                    <div className="flex-1 w-full">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Лаборатория</label>
                                        <select value={newContractLab} onChange={e => setNewContractLab(e.target.value)} className="input text-sm w-full bg-white">
                                            <option value="">Выберите...</option>
                                            {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-full sm:w-48">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Номер договора</label>
                                        <input type="text" value={newContractNumber} onChange={e => setNewContractNumber(e.target.value)} className="input text-sm w-full bg-white" placeholder="№..." />
                                    </div>
                                    <div className="w-full sm:w-48">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Дата договора</label>
                                        <input type="date" value={newContractDate} onChange={e => setNewContractDate(e.target.value)} className="input text-sm w-full bg-white" />
                                    </div>
                                    <button
                                        onClick={handleAddContract}
                                        disabled={creatingContract}
                                        className="btn btn-primary text-sm px-6 whitespace-nowrap"
                                    >
                                        {creatingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Partners List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contracts.map((contract) => {
                        const isDefault = defaultLabId === contract.providerId;
                        const isActive = activeContractId === contract.id;
                        
                        return (
                            <motion.div
                                key={contract.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`card p-5 border-2 transition-colors ${isActive ? 'border-primary-500' : isDefault ? 'border-blue-200' : 'border-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDefault ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900">{contract.provider?.name || 'Неизвестная лаборатория'}</h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                                                <Tag className="w-3 h-3" />
                                                Договор №{contract.number} от {new Date(contract.date).toLocaleDateString('ru-RU')}
                                                
                                                {contract.id.startsWith('virtual-') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setNewContractLab(contract.providerId);
                                                            setShowAddForm(true);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className="ml-1 text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-0.5 rounded transition-colors border border-amber-200"
                                                    >
                                                        Внести данные реального договора
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isDefault && (
                                        <div className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            По умолчанию
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-6">
                                    <button
                                        onClick={() => setActiveContractId(isActive ? null : contract.id)}
                                        className={`flex-1 btn text-xs py-2 ${isActive ? 'bg-primary-50 text-primary-700 hover:bg-primary-100' : 'btn-secondary'}`}
                                    >
                                        {isActive ? 'Скрыть прайс-лист' : 'Смотреть прайс-лист'}
                                    </button>
                                    {!isDefault && (
                                        <button
                                            onClick={() => handleSetDefaultLab(contract.providerId)}
                                            disabled={saving}
                                            className="flex-1 btn btn-secondary text-xs py-2"
                                        >
                                            Сделать по умолчанию
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                    {contracts.length === 0 && !loading && (
                        <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">У вас пока нет партнеров</h3>
                            <p className="text-sm text-gray-500 mb-4">Добавьте лабораторию, чтобы начать отправлять заказы.</p>
                            <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
                                <Plus className="w-4 h-4 mr-2" /> Добавить первого партнера
                            </button>
                        </div>
                    )}
                </div>

                {/* Active Price List */}
                <AnimatePresence mode="wait">
                    {activeContract && (
                        <motion.div
                            key={activeContract.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="card p-6 border-t-4 border-t-primary-500"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Прайс-лист: {activeContract.provider?.name}</h2>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Цены сформированы специально для вашего филиала по договору №{activeContract.number}.
                                    </p>
                                </div>
                                
                                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-200">
                                    <Percent className="w-4 h-4" />
                                    <span className="text-sm font-semibold">Ваша базовая скидка: {discount}%</span>
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
                                            const customPrice = activeContract.customPrices?.[product.id];
                                            const baseDiscountPrice = product.price * (1 - discount / 100);
                                            // Если есть кастомная цена, используем её, иначе применяем глобальную скидку к базовой цене
                                            const finalPrice = customPrice !== undefined && customPrice !== null ? customPrice : baseDiscountPrice;
                                            const hasCustomPrice = customPrice !== undefined && customPrice !== null;
                                            
                                            return (
                                                <tr key={product.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                                            {product.name}
                                                            {hasCustomPrice && (
                                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-bold" title="Индивидуальная фиксированная цена">
                                                                    ФИКС
                                                                </span>
                                                            )}
                                                        </div>
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
                </AnimatePresence>

            </div>
        </div>
    );
}
