const fs = require('fs');
const file = 'src/app/api/crm/appointments/route.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /createdBy: \{ select: \{ id: true, fullName: true \} \}/g,
    `createdBy: { select: { id: true, fullName: true, email: true, phone: true } }`
);

content = content.replace(
    /assignee: \{ select: \{ id: true, fullName: true \} \}/g,
    `assignee: { select: { id: true, fullName: true, email: true, phone: true } }`
);

fs.writeFileSync(file, content);
