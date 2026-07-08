const fs = require('fs');
const file = 'src/app/optic/patients/[id]/prescriptions/[rxId]/print/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetTable = `            {/* Metrics */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Параметры коррекции</h2>
                    <table className="w-full text-center border-collapse border border-black text-sm">
                        <thead>
                            <tr className="bg-gray-100 border-b border-black">
                                <th className="py-2 px-2 border-r border-black font-bold">Глаз</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Sph</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Cyl</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Ax</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Add</th>
                                <th className="py-2 px-2 border-r border-black font-bold">PD (Даль)</th>
                                <th className="py-2 px-2 border-r border-black font-bold">PD (Близь)</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Призма</th>
                                <th className="py-2 px-2 border-r border-black font-bold">BC</th>
                                <th className="py-2 px-2 border-r border-black font-bold">DIA</th>
                                <th className="py-2 px-2 font-bold">Острота (Visus)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="py-3 px-2 border-r border-black font-bold">OD (Правый)</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odSph) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odCyl) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odAx, false) ? \`\${Math.round(prescription.odAx!)}°\` : '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odAdd) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odPd, false) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odPdNear, false) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odPrism, false) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odBc, false) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odDia, false) || '—'}</td>
                                <td className="py-3 px-2 font-mono">{fmt(prescription.visualAcuityODAfter, false) || '—'}</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-2 border-r border-black font-bold">OS (Левый)</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osSph) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osCyl) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osAx, false) ? \`\${Math.round(prescription.osAx!)}°\` : '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osAdd) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osPd, false) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osPdNear, false) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osPrism, false) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osBc, false) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osDia, false) || '—'}</td>
                                <td className="py-3 px-2 font-mono">{fmt(prescription.visualAcuityOSAfter, false) || '—'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {prescription.notes && (
                    <div className="mt-6">
                        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Примечание / Рекомендации</h2>
                        <p className="whitespace-pre-wrap">{prescription.notes}</p>
                    </div>
                )}`;

const replTable = `            {/* Medical Info */}
            <div className="space-y-6 mb-8">
                <div>
                    <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Медицинские данные</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                        {(prescription.complaints || patient.complaints) && (
                            <div className="col-span-2">
                                <span className="font-semibold">Жалобы:</span> {(prescription.complaints || patient.complaints)}
                            </div>
                        )}
                        {(prescription.diseaseHistory || patient.anamnesisDisease) && (
                            <div className="col-span-2">
                                <span className="font-semibold">Анамнез заболевания:</span> {(prescription.diseaseHistory || patient.anamnesisDisease)}
                            </div>
                        )}
                        {(prescription.medicalHistory || patient.anamnesisLife) && (
                            <div className="col-span-2">
                                <span className="font-semibold">Анамнез жизни:</span> {(prescription.medicalHistory || patient.anamnesisLife)}
                            </div>
                        )}
                        {patient.allergies && (
                            <div>
                                <span className="font-semibold">Аллергоанамнез:</span> {patient.allergies}
                            </div>
                        )}
                        {patient.heredity && (
                            <div>
                                <span className="font-semibold">Наследственность:</span> {patient.heredity}
                            </div>
                        )}
                        {patient.medications && (
                            <div>
                                <span className="font-semibold">Прием медикаментов:</span> {patient.medications}
                            </div>
                        )}
                        {patient.surgeries && (
                            <div>
                                <span className="font-semibold">Операции:</span> {patient.surgeries}
                            </div>
                        )}
                        {prescription.refraction && (
                            <div className="col-span-2">
                                <span className="font-semibold">Рефракция:</span> {prescription.refraction}
                            </div>
                        )}
                        {prescription.cycloplegia && (
                            <div className="col-span-2">
                                <span className="font-semibold">Циклоплегия:</span> {prescription.cycloplegia}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Параметры коррекции</h2>
                    <table className="w-full text-center border-collapse border border-black text-sm">
                        <thead>
                            <tr className="bg-gray-100 border-b border-black">
                                <th className="py-2 px-2 border-r border-black font-bold">Глаз</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Sph</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Cyl</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Ax</th>
                                <th className="py-2 px-2 border-r border-black font-bold">Add</th>
                                {prescription.type !== 'contacts' && prescription.type !== 'ortho-k' && (
                                    <>
                                        <th className="py-2 px-2 border-r border-black font-bold">PD (Даль)</th>
                                        <th className="py-2 px-2 border-r border-black font-bold">PD (Близь)</th>
                                        <th className="py-2 px-2 border-r border-black font-bold">Призма</th>
                                    </>
                                )}
                                {(prescription.type === 'contacts' || prescription.type === 'ortho-k') && (
                                    <>
                                        <th className="py-2 px-2 border-r border-black font-bold">BC</th>
                                        <th className="py-2 px-2 border-r border-black font-bold">DIA</th>
                                    </>
                                )}
                                <th className="py-2 px-2 font-bold">Острота (Visus)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-300">
                                <td className="py-3 px-2 border-r border-black font-bold">OD (Правый)</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odSph) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odCyl) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odAx, false) ? \`\${Math.round(prescription.odAx!)}°\` : '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odAdd) || '—'}</td>
                                {prescription.type !== 'contacts' && prescription.type !== 'ortho-k' && (
                                    <>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odPd, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odPdNear, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odPrism, false) || '—'}</td>
                                    </>
                                )}
                                {(prescription.type === 'contacts' || prescription.type === 'ortho-k') && (
                                    <>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odBc, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.odDia, false) || '—'}</td>
                                    </>
                                )}
                                <td className="py-3 px-2 font-mono">{fmt(prescription.visualAcuityODAfter, false) || '—'}</td>
                            </tr>
                            <tr>
                                <td className="py-3 px-2 border-r border-black font-bold">OS (Левый)</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osSph) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osCyl) || '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osAx, false) ? \`\${Math.round(prescription.osAx!)}°\` : '—'}</td>
                                <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osAdd) || '—'}</td>
                                {prescription.type !== 'contacts' && prescription.type !== 'ortho-k' && (
                                    <>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osPd, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osPdNear, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osPrism, false) || '—'}</td>
                                    </>
                                )}
                                {(prescription.type === 'contacts' || prescription.type === 'ortho-k') && (
                                    <>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osBc, false) || '—'}</td>
                                        <td className="py-3 px-2 border-r border-gray-300 font-mono">{fmt(prescription.osDia, false) || '—'}</td>
                                    </>
                                )}
                                <td className="py-3 px-2 font-mono">{fmt(prescription.visualAcuityOSAfter, false) || '—'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {prescription.notes && (
                    <div className="mt-6">
                        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">Примечание / Рекомендации</h2>
                        <p className="whitespace-pre-wrap">{prescription.notes}</p>
                    </div>
                )}`;

if (content.includes('Параметры коррекции')) {
    content = content.replace(targetTable, replTable);
    fs.writeFileSync(file, content);
    console.log('Fixed print page.tsx');
} else {
    console.log('Could not find target block in print page.tsx');
}
