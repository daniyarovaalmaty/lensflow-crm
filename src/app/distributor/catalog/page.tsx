'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Pencil, X, Save, Package, Droplets, Wrench,
    Search, DollarSign, FileText, Barcode, Check
} from 'lucide-react';
import type { SubRole } from '@/types/user';

interface Product {
    id: string;
    name: string;
    category: string;
    sku: string | null;
    name1c: string | null;
    code: string | null;
    description: string | null;
    price: number;
    priceByDk?: Record<string, number> | null;
    unit: string;
    isActive: boolean;
    sortOrder: number;
}

interface PriceList {
    lenses: Record<string, Record<string, number>>;
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

const DEFAULT_PRICES: PriceList = {
    lenses: {
        probe: { '50': 12000 },
        spherical: { '100': 25000, '125': 28000, '180': 31000 },
        toric: { '100': 30000, '125': 33000, '180': 36000 },
    }
};

export default function CatalogPage() {
    const { data: session } = useSession();
    const subRole = session?.user?.subRole as SubRole;
    const canEditPrices = subRole === 'dist_head' || subRole === 'dist_admin';

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('');

    const [priceList, setPriceList] = useState<PriceList>(DEFAULT_PRICES);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state for DK prices
    const [dkPrices, setDkPrices] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchProducts();
        fetchPriceList();
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

    const fetchPriceList = async () => {
        try {
            const res = await fetch('/api/distributor/pricelist');
            if (res.ok) {
                const data = await res.json();
                if (data.priceList) {
                    setPriceList(data.priceList);
                }
            }
        } catch (e) { console.error(e); }
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        
        // Initialize form with current prices
        let currentPrices = {};
        if (product.category === 'lens') {
            const desc = product.description?.toLowerCase() || '';
            const type = desc === 'rgp' ? 'probe' : desc;
            
            if (type && priceList.lenses[type]) {
                currentPrices = { ...priceList.lenses[type] };
            } else if (product.priceByDk) {
                currentPrices = { ...product.priceByDk };
            }
        }
        
        setDkPrices(currentPrices);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!editingProduct) return;
        setIsSaving(true);

        const newPriceList = JSON.parse(JSON.stringify(priceList)); // deep clone
        if (!newPriceList.lenses) newPriceList.lenses = {};

        if (editingProduct.category === 'lens') {
            const desc = editingProduct.description?.toLowerCase() || '';
            const type = desc === 'rgp' ? 'probe' : desc;
            
            if (type) {
                newPriceList.lenses[type] = dkPrices;
            }
        }

        try {
            const res = await fetch('/api/distributor/pricelist', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceList: newPriceList }),
            });
            
            if (res.ok) {
                setPriceList(newPriceList);
                setShowModal(false);
                fetchProducts(); // Refresh products to get the patched prices
            }
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
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
                                    {canEditPrices && product.category === 'lens' && (
                                        <button onClick={() => openEditModal(product)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                                {product.description && (
                                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description === 'toric' ? 'Торическая линза' : product.description === 'spherical' ? 'Сферическая линза' : product.description === 'rgp' ? 'Пробная линза' : product.description}</p>
                                )}
                                
                                {/* Price by DK for lenses */}
                                {product.category === 'lens' && product.priceByDk && Object.keys(product.priceByDk).length > 0 ? (
                                    <div className="pt-3 border-t border-gray-100 space-y-1.5">
                                        {Object.entries(product.priceByDk).sort(([a], [b]) => Number(a) - Number(b)).map(([dk, p]) => (
                                            <div key={dk} className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">DK {dk}</span>
                                                <span className="font-semibold text-gray-900">{formatPrice(p as number)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-end justify-between mt-auto pt-3 border-t border-gray-100">
                                        <div>
                                            <p className="text-xs text-gray-400">Цена за {product.unit}</p>
                                            <p className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</p>
                                        </div>
                                        {product.sku && (
                                            <span className="text-xs text-gray-400 font-mono">#{product.sku}</span>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Prices Modal */}
            <AnimatePresence>
                {showModal && editingProduct && (
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
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Цены для оптик</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">{editingProduct.name}</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="p-5 space-y-4">
                                {Object.keys(dkPrices).length > 0 ? (
                                    Object.entries(dkPrices).sort(([a], [b]) => Number(a) - Number(b)).map(([dk, price]) => (
                                        <div key={dk}>
                                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                                                DK {dk} (₸)
                                            </label>
                                            <input
                                                type="number"
                                                value={price}
                                                onChange={e => setDkPrices(prev => ({ ...prev, [dk]: Number(e.target.value) }))}
                                                className="input w-full"
                                                min="0"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Для этого товара пока нельзя настроить индивидуальную цену дистрибьютора.</p>
                                )}
                            </div>
                            
                            <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50">
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                                    Отмена
                                </button>
                                <button onClick={handleSave} disabled={isSaving || Object.keys(dkPrices).length === 0} className="btn btn-primary gap-2">
                                    {isSaving ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Сохранение...</>
                                    ) : (
                                        <><Save className="w-4 h-4" /> Сохранить</>
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
