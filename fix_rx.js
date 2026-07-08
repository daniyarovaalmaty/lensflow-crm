const fs = require('fs');
const file = 'src/app/optic/patients/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix PrescriptionCard
content = content.replace(
    `                                    {[['Sph', rx.odSph], ['Cyl', rx.odCyl], ['Ax', rx.odAx, false], ['Add', rx.odAdd], ['PD Даль', rx.odPd, false], ['PD Близь', rx.odPdNear, false], ['Призма', rx.odPrism, false], ['BC', rx.odBc, false], ['DIA', rx.odDia, false], ['Visus с корр.', rx.visualAcuityODAfter, false]].map(([label, val, p = true]) => {`,
    `                                    {[['Sph', rx.odSph], ['Cyl', rx.odCyl], ['Ax', rx.odAx, false], ['Add', rx.odAdd], 
                                          rx.type !== 'contacts' && rx.type !== 'ortho-k' ? ['PD Даль', rx.odPd, false] : null, 
                                          rx.type !== 'contacts' && rx.type !== 'ortho-k' ? ['PD Близь', rx.odPdNear, false] : null, 
                                          rx.type !== 'contacts' && rx.type !== 'ortho-k' ? ['Призма', rx.odPrism, false] : null, 
                                          rx.type === 'contacts' || rx.type === 'ortho-k' ? ['BC', rx.odBc, false] : null, 
                                          rx.type === 'contacts' || rx.type === 'ortho-k' ? ['DIA', rx.odDia, false] : null, 
                                          ['Visus с корр.', rx.visualAcuityODAfter, false]
                                      ].filter(Boolean).map((item) => {
                                        const [label, val, p = true] = item;`
);

content = content.replace(
    `                                    {[['Sph', rx.osSph], ['Cyl', rx.osCyl], ['Ax', rx.osAx, false], ['Add', rx.osAdd], ['PD Даль', rx.osPd, false], ['PD Близь', rx.osPdNear, false], ['Призма', rx.osPrism, false], ['BC', rx.osBc, false], ['DIA', rx.osDia, false], ['Visus с корр.', rx.visualAcuityOSAfter, false]].map(([label, val, p = true]) => {`,
    `                                    {[['Sph', rx.osSph], ['Cyl', rx.osCyl], ['Ax', rx.osAx, false], ['Add', rx.osAdd], 
                                          rx.type !== 'contacts' && rx.type !== 'ortho-k' ? ['PD Даль', rx.osPd, false] : null, 
                                          rx.type !== 'contacts' && rx.type !== 'ortho-k' ? ['PD Близь', rx.osPdNear, false] : null, 
                                          rx.type !== 'contacts' && rx.type !== 'ortho-k' ? ['Призма', rx.osPrism, false] : null, 
                                          rx.type === 'contacts' || rx.type === 'ortho-k' ? ['BC', rx.osBc, false] : null, 
                                          rx.type === 'contacts' || rx.type === 'ortho-k' ? ['DIA', rx.osDia, false] : null, 
                                          ['Visus с корр.', rx.visualAcuityOSAfter, false]
                                      ].filter(Boolean).map((item) => {
                                        const [label, val, p = true] = item;`
);

// 2. Fix the RxForm
const formODTarget = `                                                <RxField label="Add" field="odAdd" rxForm={rxForm} setRxForm={setRxForm} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <RxField label="PD Даль" field="odPd" rxForm={rxForm} setRxForm={setRxForm} />
                                                    <RxField label="PD Близь" field="odPdNear" rxForm={rxForm} setRxForm={setRxForm} />
                                                </div>
                                                <RxField label="Призма" field="odPrism" rxForm={rxForm} setRxForm={setRxForm} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <RxField label="BC (Кривизна)" field="odBc" rxForm={rxForm} setRxForm={setRxForm} />
                                                    <RxField label="DIA (Диаметр)" field="odDia" rxForm={rxForm} setRxForm={setRxForm} />
                                                </div>`;

const formODRepl = `                                                <RxField label="Add" field="odAdd" rxForm={rxForm} setRxForm={setRxForm} />
                                                {rxForm.type !== 'contacts' && rxForm.type !== 'ortho-k' && (
                                                    <>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <RxField label="PD Даль" field="odPd" rxForm={rxForm} setRxForm={setRxForm} />
                                                            <RxField label="PD Близь" field="odPdNear" rxForm={rxForm} setRxForm={setRxForm} />
                                                        </div>
                                                        <RxField label="Призма" field="odPrism" rxForm={rxForm} setRxForm={setRxForm} />
                                                    </>
                                                )}
                                                {(rxForm.type === 'contacts' || rxForm.type === 'ortho-k') && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <RxField label="BC (Кривизна)" field="odBc" rxForm={rxForm} setRxForm={setRxForm} />
                                                        <RxField label="DIA (Диаметр)" field="odDia" rxForm={rxForm} setRxForm={setRxForm} />
                                                    </div>
                                                )}`;

content = content.replace(formODTarget, formODRepl);

const formOSTarget = `                                                <RxField label="Add" field="osAdd" rxForm={rxForm} setRxForm={setRxForm} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <RxField label="PD Даль" field="osPd" rxForm={rxForm} setRxForm={setRxForm} />
                                                    <RxField label="PD Близь" field="osPdNear" rxForm={rxForm} setRxForm={setRxForm} />
                                                </div>
                                                <RxField label="Призма" field="osPrism" rxForm={rxForm} setRxForm={setRxForm} />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <RxField label="BC (Кривизна)" field="osBc" rxForm={rxForm} setRxForm={setRxForm} />
                                                    <RxField label="DIA (Диаметр)" field="osDia" rxForm={rxForm} setRxForm={setRxForm} />
                                                </div>`;

const formOSRepl = `                                                <RxField label="Add" field="osAdd" rxForm={rxForm} setRxForm={setRxForm} />
                                                {rxForm.type !== 'contacts' && rxForm.type !== 'ortho-k' && (
                                                    <>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <RxField label="PD Даль" field="osPd" rxForm={rxForm} setRxForm={setRxForm} />
                                                            <RxField label="PD Близь" field="osPdNear" rxForm={rxForm} setRxForm={setRxForm} />
                                                        </div>
                                                        <RxField label="Призма" field="osPrism" rxForm={rxForm} setRxForm={setRxForm} />
                                                    </>
                                                )}
                                                {(rxForm.type === 'contacts' || rxForm.type === 'ortho-k') && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <RxField label="BC (Кривизна)" field="osBc" rxForm={rxForm} setRxForm={setRxForm} />
                                                        <RxField label="DIA (Диаметр)" field="osDia" rxForm={rxForm} setRxForm={setRxForm} />
                                                    </div>
                                                )}`;

content = content.replace(formOSTarget, formOSRepl);

fs.writeFileSync(file, content);
console.log('Fixed page.tsx');
