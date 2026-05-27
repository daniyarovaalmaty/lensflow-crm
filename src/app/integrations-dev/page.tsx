'use client';

import React, { useState } from 'react';

export default function IntegrationsDevPage() {
  const [moyskladData, setMoyskladData] = useState<any>(null);
  const [itigrisData, setItigrisData] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchIntegration = async (type: 'moysklad' | 'itigris') => {
    setLoading(type);
    try {
      const res = await fetch(`/api/${type}`);
      const json = await res.json();
      if (type === 'moysklad') setMoyskladData(json);
      if (type === 'itigris') setItigrisData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen text-gray-800">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Панель интеграций API (DEV)</h1>
            <p className="text-gray-500 text-sm mt-1">Безопасная тестовая среда для проверки обмена данными</p>
          </div>
          <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-amber-300">
            DEV ENVIRONMENT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* КАРТОЧКА МОЙСКЛАД */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">МойСклад</h2>
                <p className="text-xs text-gray-400">Синхронизация остатков очков и линз</p>
              </div>
              <span className={`w-3 h-3 rounded-full ${moyskladData ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            </div>
            
            <button
              onClick={() => fetchIntegration('moysklad')}
              disabled={loading === 'moysklad'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition duration-200 disabled:opacity-50"
            >
              {loading === 'moysklad' ? 'Синхронизация...' : 'Запросить остатки товаров'}
            </button>

            {moyskladData && (
              <div className="mt-4 bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono max-h-60 overflow-y-auto">
                <p className="text-gray-400 mb-2">// Ответ от {moyskladData.source}:</p>
                <p className="mb-2">Последняя синхронизация: {new Date(moyskladData.lastSync).toLocaleTimeString()}</p>
                <pre>{JSON.stringify(moyskladData.data, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* КАРТОЧКА ITIGRIS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Itigris ERP</h2>
                <p className="text-xs text-gray-400">Импорт медицинских рецептов и визитов</p>
              </div>
              <span className={`w-3 h-3 rounded-full ${itigrisData ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            </div>

            <button
              onClick={() => fetchIntegration('itigris')}
              disabled={loading === 'itigris'}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition duration-200 disabled:opacity-50"
            >
              {loading === 'itigris' ? 'Загрузка данных...' : 'Проверить новые рецепты'}
            </button>

            {itigrisData && (
              <div className="mt-4 bg-gray-900 text-indigo-300 p-4 rounded-lg text-xs font-mono max-h-60 overflow-y-auto">
                <p className="text-gray-400 mb-2">// Данные из {itigrisData.source}:</p>
                <pre>{JSON.stringify(itigrisData.demoData, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* БЛОК 1С (ПЛАНЫ) */}
        <div className="mt-8 bg-slate-800 text-white p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-2">Шлюз обмена с 1С:Предприятие</h3>
          <p className="text-slate-400 text-sm mb-4">
            Эндпоинт <code className="bg-slate-700 px-1 py-0.5 rounded text-amber-400 text-xs">/api/onec</code> полностью готов к приему входящих POST-запросов (Webhooks) от конфигурации «1С:Управление нашей фирмой» при изменении статуса контрагентов или проведении накладных.
          </p>
          <div className="flex gap-2 text-xs bg-slate-900 p-3 rounded font-mono text-emerald-400 border border-slate-700">
            <span className="text-amber-500">[POST]</span> ready_to_receive_1c_xml_data
          </div>
        </div>

      </div>
    </div>
  );
}