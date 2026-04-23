'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Plus, Search, X, Eye, Edit2, Trash2,
    Tag, ShoppingBag, Droplets, Glasses, Wrench, Star,
    Camera, DollarSign, AlertTriangle, BarChart3, Image as ImageIcon, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

// ==================== Types ====================
interface OpticProduct {
    id: string;
    name: string;
    slug: string | null;
    category: string;
    type: string;
    brand: string | null;
    model: string | null;
    sku: string | null;
    barcode: string | null;
    shortDescription: string | null;
    fullDescription: string | null;
    images: string[] | null;
    specs: Record<string, string> | null;
    purchasePrice: number;
    retailPrice: number;
    minStock: number;
    currentStock: number;
    unit: string;
    trackSerials: boolean;
    isPublic: boolean;
    isActive: boolean;
    createdAt: string;
    _count?: { stockItems: number };
}

// ==================== Constants ====================
const CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
    frame: { label: 'Оправы', icon: Glasses, color: 'bg-blue-50 text-blue-700' },
    sun_glasses: { label: 'Солнцезащитные', icon: Star, color: 'bg-amber-50 text-amber-700' },
    contact_lens: { label: 'Контактные линзы', icon: Eye, color: 'bg-purple-50 text-purple-700' },
    spectacle_lens: { label: 'Очковые линзы', icon: Eye, color: 'bg-indigo-50 text-indigo-700' },
    solution: { label: 'Растворы', icon: Droplets, color: 'bg-cyan-50 text-cyan-700' },
    accessory: { label: 'Аксессуары', icon: ShoppingBag, color: 'bg-pink-50 text-pink-700' },
    service_exam: { label: 'Проверка зрения', icon: Wrench, color: 'bg-emerald-50 text-emerald-700' },
    service_fitting: { label: 'Подбор линз', icon: Wrench, color: 'bg-emerald-50 text-emerald-700' },
    service_cutting: { label: 'Вытачка линз', icon: Wrench, color: 'bg-emerald-50 text-emerald-700' },
    service_repair: { label: 'Ремонт очков', icon: Wrench, color: 'bg-emerald-50 text-emerald-700' },
    service_other: { label: 'Другие услуги', icon: Wrench, color: 'bg-emerald-50 text-emerald-700' },
};

const CATEGORY_GROUPS = [
    { key: 'all', label: 'Все' },
    { key: 'products', label: 'Товары' },
    { key: 'services', label: 'Услуги' },
];

const fmt = (n: number) => n.toLocaleString('ru-RU');

export default function OpticCatalogPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [products, setProducts] = useState<OpticProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState<OpticProduct | null>(null);
    const [detailProduct, setDetailProduct] = useState<OpticProduct | null>(null);

    // Form state
    const [form, setForm] = useState({
        name: '', category: 'frame', brand: '', model: '', sku: '', barcode: '',
        shortDescription: '', fullDescription: '', purchasePrice: '', retailPrice: '',
        minStock: '0', unit: 'шт', trackSerials: false, isPublic: false,
        images: [] as string[], specs: {} as Record<string, string>,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadProducts(); }, []);

    const loadProducts = async () => {
        try {
            const res = await fetch('/api/optic/products');
            if (res.ok) setProducts(await res.json());
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = useMemo(() => {
        let result = products.filter(p => p.isActive);
        if (categoryFilter === 'products') result = result.filter(p => p.type === 'product');
        else if (categoryFilter === 'services') result = result.filter(p => p.type === 'service');
        else if (categoryFilter !== 'all') result = result.filter(p => p.category === categoryFilter);
        if (search) {
            const s = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(s) ||
                p.brand?.toLowerCase().includes(s) ||
                p.sku?.toLowerCase().includes(s)
            );
        }
        return result;
    }, [products, categoryFilter, search]);

    const openCreateForm = () => {
        setEditProduct(null);
        setForm({
            name: '', category: 'frame', brand: '', model: '', sku: '', barcode: '',
            shortDescription: '', fullDescription: '', purchasePrice: '', retailPrice: '',
            minStock: '0', unit: 'шт', trackSerials: false, isPublic: false,
            images: [], specs: {},
        });
        setShowForm(true);
    };

    const openEditForm = (p: OpticProduct) => {
        setEditProduct(p);
        setForm({
            name: p.name, category: p.category, brand: p.brand || '', model: p.model || '',
            sku: p.sku || '', barcode: p.barcode || '',
            shortDescription: p.shortDescription || '', fullDescription: p.fullDescription || '',
            purchasePrice: String(p.purchasePrice || ''), retailPrice: String(p.retailPrice || ''),
            minStock: String(p.minStock || '0'), unit: p.unit || 'шт',
            trackSerials: p.trackSerials, isPublic: p.isPublic,
            images: (p.images as string[]) || [], specs: (p.specs as Record<string, string>) || {},
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editProduct ? `/api/optic/products/${editProduct.id}` : '/api/optic/products';
            const method = editProduct ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                await loadProducts();
                setShowForm(false);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Деактивировать товар?')) return;
        const res = await fetch(`/api/optic/products/${id}`, { method: 'DELETE' });
        if (res.ok) await loadProducts();
    };

    const isService = form.category.startsWith('service_');

    // ==================== Stats ====================
    const stats = useMemo(() => {
        const active = products.filter(p => p.isActive);
        const totalProducts = active.filter(p => p.type === 'product').length;
        const totalServices = active.filter(p => p.type === 'service').length;
        const lowStock = active.filter(p => p.type === 'product' && p.currentStock <= p.minStock && p.minStock > 0).length;
        const totalValue = active.reduce((s, p) => s + (p.currentStock * p.retailPrice), 0);
        return { totalProducts, totalServices, lowStock, totalValue };
    }, [products]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <Link href="/optic/dashboard" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 mb-1">
                                <ArrowLeft className="w-3 h-3" /> Назад
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900">Каталог товаров и услуг</h1>
                            <p className="text-sm text-gray-500 mt-1">Управление ассортиментом вашей оптики</p>
                        </div>
                        <button
                            onClick={openCreateForm}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Добавить
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <div className="bg-blue-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-blue-700">{stats.totalProducts}</div>
                            <div className="text-xs text-blue-600">Товаров</div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-emerald-700">{stats.totalServices}</div>
                            <div className="text-xs text-emerald-600">Услуг</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-amber-700">{stats.lowStock}</div>
                            <div className="text-xs text-amber-600">Мало на складе</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-purple-700">{fmt(stats.totalValue)} ₸</div>
                            <div className="text-xs text-purple-600">Стоимость склада</div>
                        </div>
                    </div>

                    {/* Search + Category Filter */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Поиск по названию, бренду, артикулу..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {CATEGORY_GROUPS.map(g => (
                                <button
                                    key={g.key}
                                    onClick={() => setCategoryFilter(g.key)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                        categoryFilter === g.key
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {g.label}
                                </button>
                            ))}
                            <div className="w-px bg-gray-200 mx-1" />
                            {Object.entries(CATEGORIES).filter(([k]) => !k.startsWith('service_')).map(([key, cat]) => (
                                <button
                                    key={key}
                                    onClick={() => setCategoryFilter(key)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                                        categoryFilter === key
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-20">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Нет товаров</p>
                        <button onClick={openCreateForm} className="mt-4 text-primary-600 font-medium text-sm hover:underline">
                            + Добавить первый товар
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => {
                            const cat = CATEGORIES[product.category];
                            const CatIcon = cat?.icon || Package;
                            const stock = product._count?.stockItems ?? product.currentStock;
                            const isLow = product.type === 'product' && product.minStock > 0 && stock <= product.minStock;
                            const margin = product.retailPrice - product.purchasePrice;
                            const marginPct = product.purchasePrice > 0 ? Math.round((margin / product.purchasePrice) * 100) : 0;
                            const mainImage = (product.images as string[] | null)?.[0];

                            return (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                                    onClick={() => setDetailProduct(product)}
                                >
                                    {/* Image */}
                                    <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                                        {mainImage ? (
                                            <img src={mainImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <CatIcon className="w-16 h-16 text-gray-200" />
                                            </div>
                                        )}
                                        {/* Category badge */}
                                        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold ${cat?.color || 'bg-gray-100 text-gray-600'}`}>
                                            {cat?.label || product.category}
                                        </div>
                                        {isLow && (
                                            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Мало
                                            </div>
                                        )}
                                        {product.isPublic && (
                                            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-green-500 text-white text-[10px] font-bold">
                                                На витрине
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        {product.brand && (
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{product.brand}</p>
                                        )}
                                        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{product.name}</h3>
                                        {product.shortDescription && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.shortDescription}</p>
                                        )}

                                        <div className="flex items-end justify-between mt-3">
                                            <div>
                                                <div className="text-lg font-bold text-gray-900">{fmt(product.retailPrice)} ₸</div>
                                                {product.type === 'product' && product.purchasePrice > 0 && (
                                                    <div className="text-[10px] text-gray-400">
                                                        Закуп: {fmt(product.purchasePrice)} ₸ • Маржа {marginPct}%
                                                    </div>
                                                )}
                                            </div>
                                            {product.type === 'product' ? (
                                                <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                                                    isLow ? 'bg-red-50 text-red-600' : stock > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {stock} {product.unit}
                                                </div>
                                            ) : (
                                                <div className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                                                    Услуга
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="border-t border-gray-50 px-4 py-2.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={e => { e.stopPropagation(); openEditForm(product); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" /> Изменить
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(product.id); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Удалить
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ==================== CREATE/EDIT MODAL ==================== */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto" onClick={() => setShowForm(false)}>
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mb-[5vh] max-h-[85vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
                                <h2 className="text-lg font-bold text-gray-900">
                                    {editProduct ? 'Редактировать' : 'Новый товар / услуга'}
                                </h2>
                            </div>

                            <div className="px-6 py-4 space-y-4">
                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Категория *</label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <optgroup label="Товары">
                                            <option value="frame">Оправы</option>
                                            <option value="sun_glasses">Солнцезащитные очки</option>
                                            <option value="contact_lens">Контактные линзы</option>
                                            <option value="spectacle_lens">Очковые линзы</option>
                                            <option value="solution">Растворы</option>
                                            <option value="accessory">Аксессуары</option>
                                        </optgroup>
                                        <optgroup label="Услуги">
                                            <option value="service_exam">Проверка зрения</option>
                                            <option value="service_fitting">Подбор линз</option>
                                            <option value="service_cutting">Вытачка / обработка линз</option>
                                            <option value="service_repair">Ремонт очков</option>
                                            <option value="service_other">Другие услуги</option>
                                        </optgroup>
                                    </select>
                                </div>

                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder={isService ? 'Проверка зрения (полная)' : 'Ray-Ban RB5228'}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Brand + Model (only for products) */}
                                {!isService && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Бренд</label>
                                            <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
                                                placeholder="Ray-Ban" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
                                            <input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
                                                placeholder="RB5228" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                    </div>
                                )}

                                {/* SKU + Barcode */}
                                {!isService && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Артикул (SKU)</label>
                                            <input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                                                placeholder="F-001" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Штрих-код</label>
                                            <input type="text" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })}
                                                placeholder="4607022980001" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Краткое описание</label>
                                    <textarea
                                        value={form.shortDescription}
                                        onChange={e => setForm({ ...form, shortDescription: e.target.value })}
                                        placeholder="Классическая прямоугольная оправа из ацетата..."
                                        rows={2}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 resize-none"
                                    />
                                </div>

                                {/* Prices */}
                                <div className="grid grid-cols-2 gap-3">
                                    {!isService && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Закупочная цена (₸)</label>
                                            <input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })}
                                                placeholder="15000" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                    )}
                                    <div className={isService ? 'col-span-2' : ''}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {isService ? 'Стоимость услуги (₸)' : 'Розничная цена (₸)'}
                                        </label>
                                        <input type="number" value={form.retailPrice} onChange={e => setForm({ ...form, retailPrice: e.target.value })}
                                            placeholder="25000" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                    </div>
                                </div>

                                {/* Stock settings (only products) */}
                                {!isService && (
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Мин. остаток</label>
                                            <input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Ед. измерения</label>
                                            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                                                <option value="шт">шт</option>
                                                <option value="упак">упак</option>
                                                <option value="мл">мл</option>
                                                <option value="пара">пара</option>
                                            </select>
                                        </div>
                                        <div className="flex items-end pb-1">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={form.trackSerials}
                                                    onChange={e => setForm({ ...form, trackSerials: e.target.checked })}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                                                <span className="text-xs text-gray-600">Серийный учёт</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Public toggle */}
                                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                                    <input type="checkbox" checked={form.isPublic}
                                        onChange={e => setForm({ ...form, isPublic: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-primary-600" />
                                    <div>
                                        <span className="text-sm font-medium text-gray-700">Показывать на витрине</span>
                                        <p className="text-xs text-gray-400">Будет виден на публичной странице оптики</p>
                                    </div>
                                </label>
                            </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
                                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                                    Отмена
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!form.name || saving}
                                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                                >
                                    {saving ? 'Сохранение...' : editProduct ? 'Сохранить' : 'Создать'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ==================== DETAIL MODAL ==================== */}
            <AnimatePresence>
                {detailProduct && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto" onClick={() => setDetailProduct(null)}>
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mb-[5vh]"
                        >
                            {/* Image */}
                            <div className="aspect-video bg-gray-50 rounded-t-2xl overflow-hidden relative">
                                {(detailProduct.images as string[] | null)?.[0] ? (
                                    <img src={(detailProduct.images as string[])[0]} alt={detailProduct.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-20 h-20 text-gray-200" />
                                    </div>
                                )}
                                <button onClick={() => setDetailProduct(null)} className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                                    <X className="w-4 h-4 text-gray-700" />
                                </button>
                                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold ${CATEGORIES[detailProduct.category]?.color || 'bg-gray-100'}`}>
                                    {CATEGORIES[detailProduct.category]?.label || detailProduct.category}
                                </div>
                            </div>

                            <div className="p-6">
                                {detailProduct.brand && (
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{detailProduct.brand}</p>
                                )}
                                <h2 className="text-xl font-bold text-gray-900">{detailProduct.name}</h2>
                                {detailProduct.shortDescription && (
                                    <p className="text-sm text-gray-500 mt-2">{detailProduct.shortDescription}</p>
                                )}

                                {/* Prices */}
                                <div className="mt-4 flex items-baseline gap-4">
                                    <span className="text-2xl font-bold text-gray-900">{fmt(detailProduct.retailPrice)} ₸</span>
                                    {detailProduct.type === 'product' && detailProduct.purchasePrice > 0 && (
                                        <span className="text-sm text-gray-400">Закуп: {fmt(detailProduct.purchasePrice)} ₸</span>
                                    )}
                                </div>

                                {/* Details grid */}
                                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                    {detailProduct.sku && (
                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                            <span className="text-gray-400 text-xs">Артикул</span>
                                            <p className="font-medium text-gray-700">{detailProduct.sku}</p>
                                        </div>
                                    )}
                                    {detailProduct.barcode && (
                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                            <span className="text-gray-400 text-xs">Штрих-код</span>
                                            <p className="font-medium text-gray-700">{detailProduct.barcode}</p>
                                        </div>
                                    )}
                                    {detailProduct.type === 'product' && (
                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                            <span className="text-gray-400 text-xs">На складе</span>
                                            <p className="font-medium text-gray-700">{detailProduct._count?.stockItems ?? detailProduct.currentStock} {detailProduct.unit}</p>
                                        </div>
                                    )}
                                    {detailProduct.type === 'product' && detailProduct.purchasePrice > 0 && (
                                        <div className="bg-gray-50 rounded-lg px-3 py-2">
                                            <span className="text-gray-400 text-xs">Маржа</span>
                                            <p className="font-medium text-green-700">
                                                {fmt(detailProduct.retailPrice - detailProduct.purchasePrice)} ₸
                                                ({Math.round(((detailProduct.retailPrice - detailProduct.purchasePrice) / detailProduct.purchasePrice) * 100)}%)
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Specs */}
                                {detailProduct.specs && Object.keys(detailProduct.specs as object).length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Характеристики</h3>
                                        <div className="space-y-1.5">
                                            {Object.entries(detailProduct.specs as Record<string, string>).map(([k, v]) => (
                                                <div key={k} className="flex justify-between text-sm">
                                                    <span className="text-gray-400">{k}</span>
                                                    <span className="text-gray-700 font-medium">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="mt-6 flex gap-3">
                                    <button
                                        onClick={() => { setDetailProduct(null); openEditForm(detailProduct); }}
                                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Edit2 className="w-4 h-4" /> Редактировать
                                    </button>
                                    <button
                                        onClick={() => { handleDelete(detailProduct.id); setDetailProduct(null); }}
                                        className="py-2.5 px-4 border border-red-200 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
