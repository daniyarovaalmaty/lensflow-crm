import { useState, useMemo } from 'react';
import { Search, X, PackageOpen, ChevronDown, ChevronUp, Plus } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    wholesalePrice: number;
    retailPrice: number;
    brand?: string;
    model?: string;
    currentStock: number;
    stockItems?: any[];
}

interface ProductBatchSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onSelectBatch: (product: Product, batch: any) => void;
}

export function ProductBatchSelectorModal({ isOpen, onClose, products, onSelectBatch }: ProductBatchSelectorModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products.filter(p => p.currentStock > 0);
        
        const q = searchQuery.toLowerCase();
        return products.filter(p => 
            p.currentStock > 0 && (
                p.name.toLowerCase().includes(q) ||
                (p.brand && p.brand.toLowerCase().includes(q)) ||
                (p.model && p.model.toLowerCase().includes(q)) ||
                p.sku.toLowerCase().includes(q)
            )
        );
    }, [products, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-xl font-bold">Выбор товара и партии</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 border-b bg-gray-50">
                    <div className="relative">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Поиск по названию, бренду, модели, SKU..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                            <PackageOpen className="w-12 h-12 mb-3 text-gray-300" />
                            <p>Ничего не найдено или нет в наличии</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredProducts.map(product => {
                                const isExpanded = expandedProductId === product.id;
                                const availableBatches = (product.stockItems || []).filter(si => si.quantity > 0);

                                return (
                                    <div key={product.id} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                        <div 
                                            className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                                            onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                                        >
                                            <div>
                                                <h3 className="font-semibold text-lg">{product.name}</h3>
                                                <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                                                    {product.brand && <span>Бренд: {product.brand}</span>}
                                                    {product.model && <span>Модель: {product.model}</span>}
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">SKU: {product.sku}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-500">Общий остаток</div>
                                                    <div className="font-bold text-lg">{product.currentStock} шт</div>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t bg-gray-50/50 p-4">
                                                {availableBatches.length === 0 ? (
                                                    <div className="text-center py-4 text-gray-500 text-sm">
                                                        Нет доступных партий с детальной информацией (только общий остаток)
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Доступные партии</h4>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {availableBatches.map(batch => (
                                                                <div key={batch.id} className="flex items-center justify-between bg-white p-3 border rounded-md hover:border-blue-300 transition-colors">
                                                                    <div className="flex gap-6 items-center">
                                                                        {batch.diopters && (
                                                                            <div className="w-24">
                                                                                <div className="text-xs text-gray-500">Диоптрия</div>
                                                                                <div className="font-bold text-blue-700">{batch.diopters}</div>
                                                                            </div>
                                                                        )}
                                                                        <div className="w-40">
                                                                            <div className="text-xs text-gray-500">Номер партии / Серийник</div>
                                                                            <div className="font-medium text-sm">{batch.serialNumber || batch.barcode || '—'}</div>
                                                                        </div>
                                                                        <div className="w-32">
                                                                            <div className="text-xs text-gray-500">Срок годности</div>
                                                                            <div className="font-medium text-sm">
                                                                                {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('ru-RU') : '—'}
                                                                            </div>
                                                                        </div>
                                                                        <div className="w-24">
                                                                            <div className="text-xs text-gray-500">Доступно</div>
                                                                            <div className="font-bold">{batch.quantity} шт</div>
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onSelectBatch(product, batch);
                                                                        }}
                                                                        className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-md font-medium text-sm"
                                                                    >
                                                                        <Plus className="w-4 h-4" />
                                                                        Добавить
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
