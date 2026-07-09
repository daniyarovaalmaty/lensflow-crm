'use client';

import { useState } from 'react';
import TransferLog from './TransferLog';
import SendTransfer from './SendTransfer';
import ReceiveTransfer from './ReceiveTransfer';

export default function TransferModule() {
    const [subTab, setSubTab] = useState<'log' | 'send' | 'receive'>('log');

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
                        Журнал трансферов
                    </button>
                    <button
                        onClick={() => setSubTab('send')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${subTab === 'send'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        Отправить товар
                    </button>
                    <button
                        onClick={() => setSubTab('receive')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${subTab === 'receive'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        Получить товар
                    </button>
                </nav>
            </div>

            {subTab === 'log' && <TransferLog />}
            {subTab === 'send' && <SendTransfer onSuccess={() => setSubTab('log')} />}
            {subTab === 'receive' && <ReceiveTransfer onSuccess={() => setSubTab('log')} />}
        </div>
    );
}
