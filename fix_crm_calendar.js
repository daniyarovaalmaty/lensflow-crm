const fs = require('fs');

const file = 'src/app/sales/calendar/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add FileEdit to imports
content = content.replace(
    `import { Calendar as CalendarIcon, Clock, User, MapPin, Phone, Filter, Trash2, Plus, X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';`,
    `import { Calendar as CalendarIcon, Clock, User, MapPin, Phone, Filter, Trash2, Plus, X, ChevronLeft, ChevronRight, FileText, FileEdit } from 'lucide-react';`
);

// 2. Add isEditMode state
content = content.replace(
    `    const [saving, setSaving] = useState(false);`,
    `    const [saving, setSaving] = useState(false);\n    const [isEditMode, setIsEditMode] = useState(false);\n    const [editingAppId, setEditingAppId] = useState<string | null>(null);`
);

// 3. Add openEditModal function
const openEditModalCode = `
    const openEditModal = (app: LeadAppointment) => {
        setNewName(app.name || '');
        setNewPhone(app.phone ? app.phone.replace('@c.us', '') : '');
        if (app.appointmentAt) {
            const d = parseISO(app.appointmentAt);
            setNewDate(format(d, 'yyyy-MM-dd'));
            setNewTime(format(d, 'HH:mm'));
        }
        setNewType(app.appointmentNotes || 'primary_consultation');
        setNewDuration(app.duration || 30);
        setNewDoctorId(app.doctor?.id || '');
        setEditingAppId(app.id);
        setIsEditMode(true);
        setIsAddModalOpen(true);
    };
`;
content = content.replace(
    `    const handleDelete = async (id: string) => {`,
    openEditModalCode + `\n    const handleDelete = async (id: string) => {`
);

// 4. Update renderAppointmentCard to add Edit button
content = content.replace(
    `                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleDelete(app.id)}`,
    `                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => openEditModal(app)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                            <FileEdit className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => handleDelete(app.id)}`
);

// 5. Update modal heading
content = content.replace(
    `                            <h2 className="text-lg font-bold text-gray-900">Новая запись</h2>`,
    `                            <h2 className="text-lg font-bold text-gray-900">{isEditMode ? 'Редактировать запись' : 'Новая запись'}</h2>`
);

// 6. Update modal closing to reset state
content = content.replace(
    `onClick={() => setIsAddModalOpen(false)}`,
    `onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); setEditingAppId(null); }}`
);
content = content.replace(
    `onClick={() => setIsAddModalOpen(false)}`, // second instance (there's one for X, one for Cancel button)
    `onClick={() => { setIsAddModalOpen(false); setIsEditMode(false); setEditingAppId(null); }}`
);

// 7. Add Duration input to modal (next to Type and Doctor)
content = content.replace(
    `                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Тип приема</label>`,
    `                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Длительность (мин)</label>
                                <input 
                                    type="number" 
                                    value={newDuration}
                                    onChange={e => setNewDuration(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Тип приема</label>`
);

// 8. Update Save button logic
const saveCode = `
                                        const dateTime = new Date(\`\${newDate}T\${newTime}\`);
                                        if (isEditMode && editingAppId) {
                                            if (editingAppId.startsWith('appt-')) {
                                                const realId = editingAppId.replace('appt-', '');
                                                await fetch(\`/api/appointments/\${realId}\`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        date: dateTime.toISOString(),
                                                        duration: newDuration,
                                                        patientName: newName,
                                                        patientPhone: newPhone,
                                                        type: newType,
                                                        doctorId: newDoctorId || undefined
                                                    })
                                                });
                                            } else {
                                                await fetch(\`/api/crm/leads/\${editingAppId}\`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        appointmentAt: dateTime.toISOString(),
                                                        appointmentNotes: newType,
                                                        doctorId: newDoctorId || null,
                                                        name: newName,
                                                        phone: newPhone
                                                    })
                                                });
                                            }
                                        } else {
                                            await fetch('/api/appointments', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    date: dateTime.toISOString(),
                                                    duration: newDuration,
                                                    patientName: newName,
                                                    patientPhone: newPhone,
                                                    type: newType,
                                                    doctorId: newDoctorId || undefined
                                                })
                                            });
                                        }
                                        setIsAddModalOpen(false);
                                        setIsEditMode(false);
                                        setEditingAppId(null);
`;
content = content.replace(
    `                                        const dateTime = new Date(\`\${newDate}T\${newTime}\`);
                                        const res = await fetch('/api/appointments', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                date: dateTime.toISOString(),
                                                duration: newDuration,
                                                patientName: newName,
                                                patientPhone: newPhone,
                                                type: newType,
                                                doctorId: newDoctorId || undefined
                                            })
                                        });

                                        if (res.ok) {
                                            setIsAddModalOpen(false);`,
    saveCode + `\n                                        if (true) {`
);


// write
fs.writeFileSync(file, content);
console.log('CRM Calendar updated.');
