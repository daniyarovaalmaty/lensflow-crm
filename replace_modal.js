const fs = require('fs');
const file = 'src/app/sales/pipeline/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldModalStart = '{/* Рекламный Трафик & Интеграции Modal */}';
const oldModalEnd = '                )}';
const nextBlockStart = '            </AnimatePresence>';

const parts = content.split('{/* Рекламный Трафик & Интеграции Modal */}');
if (parts.length === 2) {
    const remaining = parts[1];
    const endIdx = remaining.indexOf('</AnimatePresence>');
    if (endIdx > -1) {
        const afterModal = remaining.substring(endIdx);
        
        const newModal = `{/* Manual Ad Spend Modal */}
            <AnimatePresence>
                {showIntegrationsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowIntegrationsModal(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 max-w-sm w-full border border-gray-100 shadow-xl z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Рекламный бюджет</h3>
                                <button onClick={() => setShowIntegrationsModal(false)} className="btn btn-ghost btn-sm btn-circle">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    Укажите общую сумму, потраченную на рекламу за текущий период. Это позволит CRM рассчитать стоимость привлечения лида (CPL), клиента (CAC) и возврат инвестиций (ROMI).
                                </p>
                                
                                <div>
                                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Общая сумма расходов (₸)</label>
                                    <input 
                                        type="number"
                                        placeholder="Например: 150000"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm"
                                        id="manualAdSpendInput"
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                                <button 
                                    onClick={() => setShowIntegrationsModal(false)} 
                                    className="btn bg-gray-100 text-gray-600 hover:bg-gray-200"
                                >
                                    Отмена
                                </button>
                                <button 
                                    onClick={async () => {
                                        const input = document.getElementById('manualAdSpendInput');
                                        const amount = Number(input.value) || 0;
                                        if (amount < 0) return alert('Введите корректную сумму');
                                        
                                        try {
                                            const res = await fetch('/api/crm/analytics/manual-spend', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ amount })
                                            });
                                            if (!res.ok) throw new Error('Ошибка');
                                            window.location.reload();
                                        } catch (e) {
                                            console.error(e);
                                            alert('Ошибка сохранения');
                                        }
                                    }}
                                    className="btn btn-primary"
                                >
                                    Сохранить бюджет
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            `;
            
        fs.writeFileSync(file, parts[0] + newModal + afterModal);
        console.log("Success");
    } else { console.log("End not found"); }
} else {
    console.log("Start not found");
}
