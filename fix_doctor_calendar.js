const fs = require('fs');

const file = 'src/components/calendar/DoctorCalendar.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add isEditingAppt state
content = content.replace(
    `    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);`,
    `    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);\n    const [isEditingAppt, setIsEditingAppt] = useState(false);`
);

// 2. Modify handleCreateAppointment signature to include update logic, or add handleUpdateAppointment
const handleUpdateCode = `
    const handleUpdateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAppointment) return;
        try {
            const dateTime = new Date(\`\${newApptDate}T\${newApptTime}\`);
            const res = await fetch(\`/api/appointments/\${selectedAppointment.id}\`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateTime.toISOString(),
                    duration: newApptDuration,
                    patientId: selectedPatient?.id || undefined,
                    patientName: selectedPatient ? undefined : patientSearchQuery,
                    patientPhone: selectedPatient ? undefined : newApptPhone,
                    type: newApptType,
                    doctorId: newApptDoctorId || undefined
                })
            });
            if (res.ok) {
                toast.success('Запись обновлена');
                setIsModalOpen(false);
                setIsEditingAppt(false);
                fetchAppointments();
                resetNewApptForm();
            } else {
                toast.error('Не удалось обновить запись');
            }
        } catch (error) {
            console.error(error);
            toast.error('Произошла ошибка');
        }
    };
`;

content = content.replace(
    `    const handleCreateAppointment = async (e: React.FormEvent) => {`,
    handleUpdateCode + `\n    const handleCreateAppointment = async (e: React.FormEvent) => {`
);

// 3. Add openEditMode
const openEditModeCode = `
    const openEditMode = (appt: Appointment) => {
        const d = new Date(appt.date);
        setNewApptDate(format(d, 'yyyy-MM-dd'));
        setNewApptTime(format(d, 'HH:mm'));
        setNewApptDuration(appt.duration || 30);
        setNewApptType(appt.type);
        setNewApptDoctorId(appt.doctorId || '');
        if (appt.patient) {
            setSelectedPatient(appt.patient);
            setPatientSearchQuery(appt.patient.name);
        } else {
            setSelectedPatient(null);
            setPatientSearchQuery(appt.patientName || '');
            setNewApptPhone(appt.patientPhone || '');
        }
        setIsEditingAppt(true);
    };
`;

content = content.replace(
    `    const openNewModal = (date?: Date) => {`,
    openEditModeCode + `\n    const openNewModal = (date?: Date) => {`
);

// 4. Modify openNewModal and openDetailsModal to reset isEditingAppt
content = content.replace(
    `        setIsModalOpen(true);\n    };`,
    `        setIsEditingAppt(false);\n        setIsModalOpen(true);\n    };`
);
content = content.replace(
    `        setIsModalOpen(true);\n    };\n\n    const handleStartConsultation`,
    `        setIsEditingAppt(false);\n        setIsModalOpen(true);\n    };\n\n    const handleStartConsultation`
);

// 5. Update the form render condition
content = content.replace(
    `                            {selectedAppointment ? (`,
    `                            {selectedAppointment && !isEditingAppt ? (`
);

// 6. Update the form submit handler dynamically
content = content.replace(
    `                            ) : (
                                <form onSubmit={handleCreateAppointment} className="space-y-4">`,
    `                            ) : (
                                <form onSubmit={isEditingAppt ? handleUpdateAppointment : handleCreateAppointment} className="space-y-4">`
);

// 7. Add Edit button to details view
content = content.replace(
    `                                    {selectedAppointment.status === 'scheduled' && (
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={() => updateStatus(selectedAppointment.id, 'completed')} className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100">
                                                Завершить
                                            </button>
                                            <button onClick={() => updateStatus(selectedAppointment.id, 'cancelled')} className="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-medium hover:bg-red-100">
                                                Отменить
                                            </button>
                                        </div>
                                    )}`,
    `                                    <div className="flex gap-2 pt-2">
                                            <button onClick={() => openEditMode(selectedAppointment)} className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-100">
                                                Изменить запись
                                            </button>
                                    </div>
                                    {selectedAppointment.status === 'scheduled' && (
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={() => updateStatus(selectedAppointment.id, 'completed')} className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-lg text-sm font-medium hover:bg-emerald-100">
                                                Завершить
                                            </button>
                                            <button onClick={() => updateStatus(selectedAppointment.id, 'cancelled')} className="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-medium hover:bg-red-100">
                                                Отменить
                                            </button>
                                        </div>
                                    )}`
);

// 8. Add cancel edit button to form if editing
content = content.replace(
    `                                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary flex-1 justify-center">Отмена</button>
                                        <button type="submit" className="btn btn-primary flex-1 justify-center">Создать</button>`,
    `                                        <button type="button" onClick={() => isEditingAppt ? setIsEditingAppt(false) : setIsModalOpen(false)} className="btn btn-secondary flex-1 justify-center">Отмена</button>
                                        <button type="submit" className="btn btn-primary flex-1 justify-center">{isEditingAppt ? 'Сохранить' : 'Создать'}</button>`
);

// 9. Update modal header
content = content.replace(
    `                                {selectedAppointment ? 'Карточка записи' : 'Новая запись'}`,
    `                                {isEditingAppt ? 'Редактирование записи' : selectedAppointment ? 'Карточка записи' : 'Новая запись'}`
);

fs.writeFileSync(file, content);

console.log('DoctorCalendar updated with edit capabilities.');
