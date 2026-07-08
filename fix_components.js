const fs = require('fs');

const file1 = 'src/components/calendar/DoctorCalendar.tsx';
let content1 = fs.readFileSync(file1, 'utf8');
content1 = content1.replace(
    /\{appt\.createdBy\.fullName\}/g,
    `{appt.createdBy.fullName || appt.createdBy.email || appt.createdBy.phone || 'Сотрудник'}`
);
content1 = content1.replace(
    /\{selectedAppointment\.createdBy\.fullName\}/g,
    `{selectedAppointment.createdBy.fullName || selectedAppointment.createdBy.email || selectedAppointment.createdBy.phone || 'Сотрудник'}`
);
fs.writeFileSync(file1, content1);

// No need to patch sales/calendar/page.tsx because it uses the mapped /api/crm/appointments which already guarantees fullName has a value!
