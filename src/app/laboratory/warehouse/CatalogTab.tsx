import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save, Search, PackageSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CatalogTab({ fetchProductsExternal }: { fetchProductsExternal?: () => void }) {
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formName, setFormName] = useState('');
    const [formCategory, setFormCategory] = useState('lens_blank');
    const [formSku, setFormSku] = useState('');
    const [formPurchasePrice, setFormPurchasePrice] = useState('');
    const [formUnit, setFormUnit] = useState('шт');
    const [formTrackSerials, setFormTrackSerials] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/optic/products?type=product');
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
                if (fetchProductsExternal) fetchProductsExternal();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        setFormName('');
        setFormCategory('lens_blank');
        setFormSku('');
        setFormPurchasePrice('');
        setFormUnit('шт');
        setFormTrackSerials(false);
        setShowModal(true);
    };

    const openEditModal = (p: any) => {
        setEditingProduct(p);
        setFormName(p.name);
        setFormCategory(p.category || 'lens_blank');
        setFormSku(p.sku || '');
        setFormPurchasePrice(String(p.purchasePrice || '0'));
        setFormUnit(p.unit || 'шт');
        setFormTrackSerials(!!p.trackSerials);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formName.trim()) return;
        setIsSaving(true);

        const body = {
            name: formName.trim(),
            category: formCategory,
            sku: formSku.trim() || null,
            purchasePrice: Number(formPurchasePrice) || 0,
            unit: formUnit,
            trackSerials: formTrackSerials,
            type: 'product',
            retailPrice: 0 // Not needed for lab
        };

        try {
            const url = editingProduct ? `/api/optic/products/${editingProduct.id}` : '/api/optic/products';
            const method = editingProduct ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                await fetchProducts();
                setShowModal(false);
            } else {
                const err = await res.json();
                alert(err.error || 'Ошибка при сохранении');
            }
        } catch (e) {
            console.error(e);
            alert('Ошибка сети');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (p: any) => {
        if (!confirm(`Удалить «${p.name}»? (Только если нет движений на складе)`)) return;
        try {
            const res = await fetch(`/api/optic/products/${p.id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchProducts();
            } else {
                const err = await res.json();
                alert(err.error || 'Ошибка удаления');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const filtered = products.filter(p => {
        if (!search) return true;
        const s = search.toLowerCase();
        return p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s);
    });

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Складская Номенклатура</h3>
                    <p className="text-sm text-gray-500">Материалы, заготовки и расходники для работы склада лаборатории</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Поиск материалов..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Добавить
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="py-12 text-center text-gray-400">Загрузка...</div>
            ) : filtered.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                    <PackageSearch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Номенклатура пуста или ничего не найдено</p>
                    <p className="text-sm text-gray-400 mt-1">Добавьте материалы, чтобы они появились на складе</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Название</th>
                                <th className="px-4 py-3 font-semibold">Артикул</th>
                                <th className="px-4 py-3 font-semibold">Категория</th>
                                <th className="px-4 py-3 font-semibold">Учет</th>
                                <th className="px-4 py-3 font-semibold text-right">Закуп (₸)</th>
                                <th className="px-4 py-3 font-semibold text-center">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                                    <td className="px-4 py-3 text-gray-500">{p.sku || '—'}</td>
                                    <td className="px-4 py-3 text-gray-500">
                                        <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">
                                            {p.category === 'lens_blank' ? 'Заготовка линзы' : 
                                             p.category === 'solution' ? 'Раствор' : 
                                             p.category === 'consumable' ? 'Расходник' : p.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {p.trackSerials ? 
                                            <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-md font-medium">По серийным номерам</span> : 
                                            <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium">Количественный</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">{p.purchasePrice?.toLocaleString()} ₸</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => openEditModal(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">{editingProduct ? 'Редактировать материал' : 'Добавить материал'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Название *</label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="Например: Заготовка 1.56 HMC"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Категория</label>
                                        <select
                                            value={formCategory}
                                            onChange={e => setFormCategory(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="lens_blank">Заготовка линзы</option>
                                            <option value="solution">Раствор</option>
                                            <option value="consumable">Расходный материал</option>
                                            <option value="other">Прочее</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Артикул</label>
                                        <input
                                            type="text"
                                            value={formSku}
                                            onChange={e => setFormSku(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="SKU-123"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Закупочная цена (₸)</label>
                                        <input
                                            type="number"
                                            value={formPurchasePrice}
                                            onChange={e => setFormPurchasePrice(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ед. измерения</label>
                                        <select
                                            value={formUnit}
                                            onChange={e => setFormUnit(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="шт">Штуки (шт)</option>
                                            <option value="мл">Миллилитры (мл)</option>
                                            <option value="г">Граммы (г)</option>
                                            <option value="упак">Упаковки</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formTrackSerials}
                                            onChange={e => setFormTrackSerials(e.target.checked)}
                                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                        />
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900">Учет по серийным номерам</div>
                                            <div className="text-xs text-gray-500">Учитывать каждую единицу товара уникально (например, дорогостоящие заготовки)</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !formName.trim()}
                                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSaving ? 'Сохранение...' : <><Save className="w-4 h-4" /> Сохранить</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
