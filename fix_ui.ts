import fs from 'fs';

const filePath = './src/app/optic/finances/payroll/page.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

const startStr = '{st.metrics.transactions.map((tx: any, idx: number) => (';
const endStr = `                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        </Fragment>`;

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
    console.error('Tokens not found');
    process.exit(1);
}

const replacement = `{st.metrics.transactions.map((tx: any, idx: number) => (
                                                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all flex flex-col">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="font-semibold text-gray-800 text-xs truncate pr-2" title={tx.patientName}>
                                                            {tx.patientName || 'Неизвестный пациент'}
                                                        </div>
                                                        <div className="font-bold text-emerald-600 text-sm whitespace-nowrap">
                                                            {fmt(tx.saleAmount)} ₸
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-[10px] text-gray-500 mb-2 truncate" title={tx.itemName}>
                                                        {tx.itemName || 'Оплата услуг/товаров'}
                                                    </div>
                                                    
                                                    <div className="bg-slate-50 rounded p-2 mb-2 flex flex-col gap-1 border border-slate-100">
                                                        {tx.totalCost > 0 && (
                                                            <div className="flex justify-between text-[9px]">
                                                                <span className="text-gray-500">Себестоимость:</span>
                                                                <span className="text-red-500 font-medium">-{fmt(tx.totalCost)} ₸</span>
                                                            </div>
                                                        )}
                                                        {tx.isInstallment && (
                                                            <div className="flex justify-between text-[9px]">
                                                                <span className="text-gray-500">Комиссия (Kaspi 15%):</span>
                                                                <span className="text-red-500 font-medium">-{fmt(tx.bankFee)} ₸</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between text-[10px] font-semibold mt-1 pt-1 border-t border-slate-200">
                                                            <span className="text-gray-700">Итого база:</span>
                                                            <span className="text-gray-900">{fmt(tx.netIncome)} ₸</span>
                                                        </div>
                                                        <div className="flex justify-between text-[11px] font-bold text-indigo-700 mt-1 bg-indigo-50 -mx-2 -mb-2 p-2 rounded-b">
                                                            <span>Бонус:</span>
                                                            <span>+{fmt(tx.bonus)} ₸</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                                                        <div className="text-[9px] text-gray-400 font-mono">
                                                            № {tx.id.substring(tx.id.length - 6)}
                                                        </div>
                                                        <button 
                                                            onClick={() => window.open(\`/optic/sales-history?search=\${tx.id}\`, '_blank')}
                                                            className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded no-toggle"
                                                        >
                                                            Чек <Receipt className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
`;

code = code.substring(0, startIndex) + replacement + code.substring(endIndex);

fs.writeFileSync(filePath, code);
console.log('Successfully updated page.tsx');
