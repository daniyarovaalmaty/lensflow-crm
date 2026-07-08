const fs = require('fs');

const targetFile = 'src/app/sales/calendar/page.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Import XCircle
content = content.replace(
    /import \{ Calendar as CalendarIcon, Clock, User, MapPin, Phone, Filter, Trash2, Plus, X, ChevronLeft, ChevronRight, FileText, FileEdit \} from 'lucide-react';/,
    `import { Calendar as CalendarIcon, Clock, User, MapPin, Phone, Filter, Trash2, Plus, X, ChevronLeft, ChevronRight, FileText, FileEdit, XCircle } from 'lucide-react';`
);

// 2. Add State variables inside CalendarPage
const stateInjection = `    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);
    const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);`;

content = content.replace(
    /const \[newName, setNewName\] = useState\(''\);/,
    `const [newName, setNewName] = useState('');\n${stateInjection}`
);

// 3. Add useEffect for search debounce
const useEffectInjection = `
    // Search patients debounce
    useEffect(() => {
        if (!patientSearchQuery.trim() || selectedPatient) {
            setPatientSearchResults([]);
            return;
        }
        
        const timeoutId = setTimeout(async () => {
            setIsSearchingPatient(true);
            try {
                const res = await fetch(\`/api/patients?q=\${encodeURIComponent(patientSearchQuery)}&noSync=1\`);
                if (res.ok) {
                    const data = await res.json();
                    setPatientSearchResults(data.patients || []);
                }
            } catch (err) {
                console.error('Failed to search patients', err);
            } finally {
                setIsSearchingPatient(false);
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [patientSearchQuery, selectedPatient]);
`;

content = content.replace(
    /const loadData = async \(\) => \{/,
    `${useEffectInjection}\n    const loadData = async () => {`
);

// 4. Update openEditModal to handle the new search states
const openEditModalPatch = `        setNewName(app.name || '');
        setNewPhone(app.phone ? app.phone.replace('@c.us', '') : '');
        setPatientSearchQuery(app.name || '');
        setSelectedPatient(null);`;

content = content.replace(
    /        setNewName\(app\.name \|\| ''\);\n        setNewPhone\(app\.phone \? app\.phone\.replace\('@c\.us', ''\) : ''\);/,
    openEditModalPatch
);

// 5. Update handleSelectSlot (wait, is there a handleSelectSlot? No, not in this file, it's just openEditModal and the '+' button. Let's find where setIsAddModalOpen is called to clear states)
content = content.replace(
    /setNewName\(''\);\n\s*setNewPhone\(''\);/g,
    `setNewName('');
        setNewPhone('');
        setPatientSearchQuery('');
        setSelectedPatient(null);`
);

// 6. Update the Save logic
// We need to replace:
// patientName: newName,
// patientPhone: newPhone,
// with:
// patientId: selectedPatient?.id || undefined,
// patientName: selectedPatient ? undefined : patientSearchQuery,
// patientPhone: selectedPatient ? undefined : newPhone,

content = content.replace(
    /patientName: newName,\n\s*patientPhone: newPhone,/g,
    `patientId: selectedPatient?.id || undefined,
                                                        patientName: selectedPatient ? undefined : patientSearchQuery,
                                                        patientPhone: selectedPatient ? undefined : newPhone,`
);

// 7. Update the UI inputs
const oldUI = `                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Имя пациента</label>
                                <input 
                                    type="text" 
                                    placeholder="Иван Иванов"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Телефон</label>
                                <input 
                                    type="text" 
                                    placeholder="77001234567"
                                    value={newPhone}
                                    onChange={e => setNewPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>`;

const newUI = `                            <div className="relative">
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Поиск или имя пациента</label>
                                {selectedPatient ? (
                                    <div className="flex items-center justify-between p-2.5 border border-blue-200 bg-blue-50 rounded-xl">
                                        <div>
                                            <div className="font-medium text-blue-900 text-sm">{selectedPatient.name}</div>
                                            <div className="text-xs text-blue-700">{selectedPatient.phone}</div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setSelectedPatient(null);
                                                setPatientSearchQuery(selectedPatient.name);
                                            }}
                                            className="p-1 hover:bg-blue-100 rounded-md text-blue-600"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <input 
                                            type="text" 
                                            placeholder="Иван Иванов"
                                            value={patientSearchQuery}
                                            onChange={e => setPatientSearchQuery(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                        {patientSearchQuery.length > 0 && !selectedPatient && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                                {isSearchingPatient ? (
                                                    <div className="p-3 text-sm text-center text-gray-500">Поиск...</div>
                                                ) : patientSearchResults.length > 0 ? (
                                                    patientSearchResults.map(p => (
                                                        <div 
                                                            key={p.id} 
                                                            onClick={() => {
                                                                setSelectedPatient(p);
                                                                setPatientSearchQuery('');
                                                            }}
                                                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                        >
                                                            <div className="font-medium text-gray-900 text-sm">{p.name}</div>
                                                            <div className="text-xs text-gray-500">{p.phone}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-sm text-gray-500 bg-gray-50">
                                                        Пациент не найден. Будет создана новая запись для: <span className="font-medium text-gray-900">{patientSearchQuery}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {!selectedPatient && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Телефон нового пациента</label>
                                    <input 
                                        type="tel" 
                                        placeholder="77001234567"
                                        value={newPhone}
                                        onChange={e => setNewPhone(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                </div>
                            )}`;

content = content.replace(oldUI, newUI);

// Fix disabled check
content = content.replace(
    /disabled=\{saving \|\| !newPhone \|\| !newDate \|\| !newTime \|\| !newDoctorId\}/,
    `disabled={saving || (!selectedPatient && !newPhone) || !newDate || !newTime || !newDoctorId}`
);

fs.writeFileSync(targetFile, content);
