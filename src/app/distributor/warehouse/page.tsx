'use client';

import { useState } from 'react';
import { 
    Package, RefreshCcw, FileText, ArrowRightLeft, Target, 
    ClipboardList, TrendingDown 
} from 'lucide-react';
import SupplyModule from './components/SupplyModule';
import TransferModule from './components/TransferModule';
import ProductBalances from './components/ProductBalances';
import DocumentFlowModule from './components/DocumentFlowModule';
import InventoryModule from './components/InventoryModule';
import RequestsModule from './components/RequestsModule';
import LotTrackingModule from './components/LotTrackingModule';

export default function DistributorWarehousePage() {
    const [activeTab, setActiveTab] = useState('supplies');

    const TABS = [
        { id: 'supplies', label: 'Поставки', icon: Package },
        { id: 'requests', label: 'Заявки на товар', icon: ClipboardList },
        { id: 'transfers', label: 'Трансферы', icon: ArrowRightLeft },
        { id: 'balances', label: 'Остатки товара', icon: Target },
        { id: 'tracking', label: 'Поиск по LOT', icon: Search },
        { id: 'documents', label: 'Документооборот', icon: FileText },
        { id: 'writeoffs', label: 'Списания', icon: TrendingDown },
        { id: 'inventory', label: 'Ревизии', icon: RefreshCcw }
    ];

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Управление складом</h1>
                <p className="mt-2 text-sm text-gray-500">Система учета товаров, поставок и перемещений.</p>
            </div>

            {/* Sub Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                                    ${isActive
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Module Content */}
            <div className="mt-6 bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
                {activeTab === 'supplies' && <SupplyModule />}
                {activeTab === 'requests' && <RequestsModule />}
                {activeTab === 'transfers' && <TransferModule />}
                { activeTab === 'balances' && <ProductBalances /> }
                { activeTab === 'tracking' && <LotTrackingModule /> }
                { activeTab === 'documents' && <DocumentFlowModule /> }
                { activeTab === 'writeoffs' && <DocumentFlowModule isWriteOffOnly={true} /> }
                { activeTab === 'inventory' && <InventoryModule /> }
            </div>
        </div>
    );
}
