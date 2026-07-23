import { useState, useMemo } from 'react';
import { Search, X, PackageOpen, ChevronDown, ChevronUp, Plus, ChevronRight } from 'lucide-react';
import ExpiryDateBadge from '@/app/distributor/warehouse/components/ExpiryDateBadge';
import { parseGS1Barcode } from '@/lib/utils/gs1Parser';

const getDiopterButtonClass = (items: any[]) => {
    const validItems = items.filter((item: any) => item.quantity > 0 && item.expiryDate);
    if (validItems.length === 0) return 'bg-white text-gray-900 ring-gray-200 hover:bg-gray-50';
    
    const now = new Date().getTime();
    let minDiffMonths = Infinity;
    
    validItems.forEach((item: any) => {
        const expDate = new Date(item.expiryDate);
        if (!isNaN(expDate.getTime())) {
            const diffMs = expDate.getTime() - now;
            const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
            if (diffMonths < minDiffMonths) {
                minDiffMonths = diffMonths;
            }
        }
    });

    if (minDiffMonths === Infinity) return 'bg-white text-gray-900 ring-gray-200 hover:bg-gray-50';

    if (minDiffMonths <= 0) return 'bg-red-100 text-red-800 ring-red-600/30 hover:bg-red-200';
    if (minDiffMonths <= 3) return 'bg-red-50 text-red-700 ring-red-600/20 hover:bg-red-100';
    if (minDiffMonths <= 6) return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 hover:bg-yellow-100';
    
    return 'bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100';
};

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
    const [expandedDiopters, setExpandedDiopters] = useState<Set<string>>(new Set());

    const toggleDiopterRow = (rowKey: string) => {
        const newSet = new Set(expandedDiopters);
        if (newSet.has(rowKey)) newSet.delete(rowKey);
        else newSet.add(rowKey);
        setExpandedDiopters(newSet);
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products.filter(p => p.currentStock > 0);
        
        const q = searchQuery.toLowerCase();
        return products.filter(p => 
            p.currentStock > 0 && (
                p.name.toLowerCase().includes(q) ||
                (p.brand && p.brand.toLowerCase().includes(q)) ||
                (p.model && p.model.toLowerCase().includes(q))
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
                            placeholder="Поиск по названию, бренду, модели..."
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
                                                            {(() => {
                                                                const groups: Record<string, any[]> = {};
                                                                availableBatches.forEach(b => {
                                                                    const d = b.diopters || '-';
                                                                    if (!groups[d]) groups[d] = [];
                                                                    groups[d].push(b);
                                                                });
                                                                const grouped = Object.keys(groups).sort((a, b) => {
                                                                    if (a === '-') return 1;
                                                                    if (b === '-') return -1;
                                                                    return parseFloat(a) - parseFloat(b);
                                                                }).map(d => ({
                                                                    diopter: d,
                                                                    items: groups[d].sort((x, y) => new Date(x.expiryDate).getTime() - new Date(y.expiryDate).getTime())
                                                                }));

                                                                return grouped.map((group, gIdx) => {
                                                                    const rowKey = `${product.id}_${group.diopter}`;
                                                                    const isDiopterExpanded = expandedDiopters.has(rowKey);
                                                                    return (
                                                                        <div key={rowKey} className="bg-white border rounded-md shadow-sm overflow-hidden">
                                                                            <div 
                                                                                className={`flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${gIdx > 0 ? 'border-t border-gray-100' : ''}`}
                                                                                onClick={() => toggleDiopterRow(rowKey)}
                                                                            >
                                                                                <button 
                                                                                    className={`flex items-center gap-2 focus:outline-none px-3 py-1.5 rounded-md ring-1 shadow-sm transition-colors ${getDiopterButtonClass(group.items)}`}
                                                                                >
                                                                                    {isDiopterExpanded ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
                                                                                    <span className="font-bold">{group.diopter !== '-' ? group.diopter : 'Без диоптрий'}</span>
                                                                                </button>
                                                                                <div className="text-sm text-gray-500 ml-auto">
                                                                                    Партий: {group.items.length} шт / Остаток: {group.items.reduce((sum, item) => sum + item.quantity, 0)} шт
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {isDiopterExpanded && (
                                                                                <div className="border-t border-gray-100 bg-gray-50/30 p-3 space-y-2">
                                                                                    {group.items.map(batch => {
                                                                                        const parsed = parseGS1Barcode(batch.serialNumber || '');
                                                                                        const sn = parsed.serialNumber || parsed.batchNumber || batch.serialNumber;
                                                                                        return (
                                                                                            <div key={batch.id} className="flex items-center justify-between bg-white p-3 border rounded-md hover:border-blue-300 transition-colors">
                                                                                                <div className="flex gap-6 items-center flex-1">
                                                                                                    <div className="w-48">
                                                                                                        <div className="text-xs text-gray-500 mb-1">Номер партии / Серийник</div>
                                                                                                        <div className="font-medium text-sm text-gray-900">{sn || '—'}</div>
                                                                                                    </div>
                                                                                                    <div className="w-32">
                                                                                                        <div className="text-xs text-gray-500 mb-1">Срок годности</div>
                                                                                                        <div>
                                                                                                            <ExpiryDateBadge date={batch.expiryDate} />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="w-24">
                                                                                                        <div className="text-xs text-gray-500 mb-1">Доступно</div>
                                                                                                        <div className="font-bold text-gray-900">{batch.quantity} шт</div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <button 
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        onSelectBatch(product, batch);
                                                                                                    }}
                                                                                                    className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-md font-medium text-sm transition-colors"
                                                                                                >
                                                                                                    <Plus className="w-4 h-4" />
                                                                                                    Добавить
                                                                                                </button>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
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
