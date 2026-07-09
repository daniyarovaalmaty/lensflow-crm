'use client';

import { useState } from 'react';
import NewSupplyForm from './NewSupplyForm';
import SupplyLog from './SupplyLog';

export default function SupplyModule() {
    const [subTab, setSubTab] = useState<'new' | 'log'>('log');

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setSubTab('log')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${subTab === 'log'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        Журнал поставок
                    </button>
                    <button
                        onClick={() => setSubTab('new')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${subTab === 'new'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        Новая поставка
                    </button>
                </nav>
            </div>

            {subTab === 'log' ? <SupplyLog /> : <NewSupplyForm onSuccess={() => setSubTab('log')} />}
        </div>
    );
}
