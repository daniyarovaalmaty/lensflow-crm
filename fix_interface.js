const fs = require('fs');

const file1 = 'src/components/calendar/DoctorCalendar.tsx';
let content1 = fs.readFileSync(file1, 'utf8');
content1 = content1.replace(
    /createdBy\?: \{ id: string; fullName: string \} \| null;/g,
    `createdBy?: { id: string; fullName: string; email?: string; phone?: string; } | null;`
);
fs.writeFileSync(file1, content1);
