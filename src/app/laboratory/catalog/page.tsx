'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Pencil, Trash2, X, Save, Package, Droplets, Wrench,
    Search, DollarSign, Tag, Hash
} from 'lucide-react';
import type { SubRole } from '@/types/user';

interface Product {
    id: string;
    name: string;
    category: string;
    sku: string | null;
    description: string | null;
    price: number;
    unit: string;
    isActive: boolean;
    sortOrder: number;
}

const CATEGORIES = [
    { value: 'lens', label: 'Линзы', icon: Package, color: 'bg-blue-100 text-blue-700' },
    { value: 'solution', label: 'Растворы', icon: Droplets, color: 'bg-emerald-100 text-emerald-700' },
    { value: 'accessory', label: 'Аксессуары', icon: Wrench, color: 'bg-orange-100 text-orange-700' },
];

const categoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || cat;
const categoryColor = (cat: string) => CATEGORIES.find(c => c.value === cat)?.color || 'bg-gray-100 text-gray-700';

function formatPrice(price: number) {
    return price.toLocaleString('ru-RU') + ' ₸';
}

export default function CatalogPage() {
    const { data: session } = useSession();
    const subRole = (session?.user?.subRole || 'lab_admin') as SubRole;

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form fields
    const [formName, setFormName] = useState('');
    const [formCategory, setFormCategory] = useState('lens');
    const [formSku, setFormSku] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formUnit, setFormUnit] = useState('шт');
    const [formSortOrder, setFormSortOrder] = useState('0');

    const canEdit = subRole === 'lab_head' || subRole === 'lab_admin';

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/catalog?include_inactive=true');
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        setFormName('');
        setFormCategory('lens');
        setFormSku('');
        setFormDescription('');
        setFormPrice('');
        setFormUnit('шт');
        setFormSortOrder('0');
        setShowModal(true);
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setFormName(product.name);
        setFormCategory(product.category);
        setFormSku(product.sku || '');
        setFormDescription(product.description || '');
        setFormPrice(String(product.price));
        setFormUnit(product.unit);
        setFormSortOrder(String(product.sortOrder));
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formName.trim()) return;
        setIsSaving(true);

        const body = {
            name: formName.trim(),
            category: formCategory,
            sku: formSku.trim() || null,
            description: formDescription.trim() || null,
            price: Number(formPrice) || 0,
            unit: formUnit,
            sortOrder: Number(formSortOrder) || 0,
        };

        try {
            if (editingProduct) {
                const res = await fetch(`/api/catalog/${editingProduct.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (res.ok) {
                    const updated = await res.json();
                    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
                }
            } else {
                const res = await fetch('/api/catalog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (res.ok) {
                    const created = await res.json();
                    setProducts(prev => [...prev, created]);
                }
            }
            setShowModal(false);
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async (product: Product) => {
        if (!confirm(`Удалить «${product.name}» из каталога?`)) return;
        try {
            const res = await fetch(`/api/catalog/${product.id}`, { method: 'DELETE' });
            if (res.ok) {
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: false } : p));
            }
        } catch (e) { console.error(e); }
    };

    const handleRestore = async (product: Product) => {
        try {
            const res = await fetch(`/api/catalog/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: true }),
            });
            if (res.ok) {
                setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: true } : p));
            }
        } catch (e) { console.error(e); }
    };

    const filtered = products.filter(p => {
        if (filterCategory && p.category !== filterCategory) return false;
        if (search) {
            const s = search.toLowerCase();
            return p.name.toLowerCase().includes(s) ||
                (p.sku || '').toLowerCase().includes(s) ||
                (p.description || '').toLowerCase().includes(s);
        }
        return true;
    });

    const activeProducts = filtered.filter(p => p.isActive);
    const inactiveProducts = filtered.filter(p => !p.isActive);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="skeleton w-12 h-12 rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Загрузка каталога...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <div className="bg-surface-elevated border-b border-border py-6">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Каталог товаров</h1>
                            <p className="text-gray-600 mt-1">{products.filter(p => p.isActive).length} товаров</p>
                        </div>
                        {canEdit && (
                            <button onClick={openCreateModal} className="btn btn-primary gap-2">
                                <Plus className="w-5 h-5" />
                                Добавить товар
                            </button>
                        )}
                    </div>

                    {/* Search & filters */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-5">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Поиск по названию, артикулу..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="input pl-10 w-full"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterCategory('')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!filterCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                Все
                            </button>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => setFilterCategory(cat.value === filterCategory ? '' : cat.value)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${filterCategory === cat.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <cat.icon className="w-3.5 h-3.5" />
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                {activeProducts.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">Каталог пуст</p>
                        {canEdit && (
                            <button onClick={openCreateModal} className="btn btn-primary gap-2 mt-4">
                                <Plus className="w-4 h-4" />
                                Добавить первый товар
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeProducts.map(product => (
                            <motion.div
                                key={product.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColor(product.category)}`}>
                                        {categoryLabel(product.category)}
                                    </span>
                                    {canEdit && (
                                        <div className="flex gap-1">
                                            <button onClick={() => openEditModal(product)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDelete(product)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                                {product.description && (
                                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                                )}
                                <div className="flex items-end justify-between mt-auto pt-3 border-t border-gray-100">
                                    <div>
                                        <p className="text-xs text-gray-400">Цена за {product.unit}</p>
                                        <p className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</p>
                                    </div>
                                    {product.sku && (
                                        <span className="text-xs text-gray-400 font-mono">#{product.sku}</span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Inactive products */}
                {inactiveProducts.length > 0 && canEdit && (
                    <div className="mt-8">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Удалённые товары ({inactiveProducts.length})</h3>
                        <div className="space-y-2">
                            {inactiveProducts.map(product => (
                                <div key={product.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 opacity-60">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor(product.category)}`}>
                                            {categoryLabel(product.category)}
                                        </span>
                                        <span className="text-sm text-gray-600">{product.name}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRestore(product)}
                                        className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                                    >
                                        Восстановить
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editingProduct ? 'Редактировать товар' : 'Новый товар'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                        <Tag className="w-4 h-4 text-gray-400" />
                                        Название *
                                    </label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        placeholder="Ортокератологическая линза MediLens"
                                        className="input w-full"
                                        autoFocus
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            Категория *
                                        </label>
                                        <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="input w-full">
                                            {CATEGORIES.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                            <Hash className="w-4 h-4 text-gray-400" />
                                            Артикул
                                        </label>
                                        <input
                                            type="text"
                                            value={formSku}
                                            onChange={e => setFormSku(e.target.value)}
                                            placeholder="ML-001"
                                            className="input w-full"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Описание</label>
                                    <textarea
                                        value={formDescription}
                                        onChange={e => setFormDescription(e.target.value)}
                                        placeholder="Краткое описание товара..."
                                        className="input w-full h-20 resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            Цена (₸) *
                                        </label>
                                        <input
                                            type="number"
                                            value={formPrice}
                                            onChange={e => setFormPrice(e.target.value)}
                                            placeholder="40000"
                                            className="input w-full"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Единица</label>
                                        <select value={formUnit} onChange={e => setFormUnit(e.target.value)} className="input w-full">
                                            <option value="шт">шт</option>
                                            <option value="мл">мл</option>
                                            <option value="упак">упак</option>
                                            <option value="комп">комплект</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Порядок</label>
                                        <input
                                            type="number"
                                            value={formSortOrder}
                                            onChange={e => setFormSortOrder(e.target.value)}
                                            className="input w-full"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50">
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                                    Отмена
                                </button>
                                <button onClick={handleSave} disabled={isSaving || !formName.trim()} className="btn btn-primary gap-2">
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Сохранение...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            {editingProduct ? 'Сохранить' : 'Добавить'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
