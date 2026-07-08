const fs = require('fs');

const file1 = 'src/app/api/crm/appointments/route.ts';
let content1 = fs.readFileSync(file1, 'utf8');
content1 = content1.replace(
    /createdBy: app\.createdBy \? \{ id: app\.createdBy\.id, fullName: app\.createdBy\.fullName \} : null/g,
    `createdBy: app.createdBy ? { id: app.createdBy.id, fullName: app.createdBy.fullName || app.createdBy.email || app.createdBy.phone || 'Сотрудник' } : null`
);
content1 = content1.replace(
    /createdBy: lead\.assignee \? \{ id: lead\.assignee\.id, fullName: lead\.assignee\.fullName \} : null/g,
    `createdBy: lead.assignee ? { id: lead.assignee.id, fullName: lead.assignee.fullName || lead.assignee.email || lead.assignee.phone || 'Сотрудник' } : null`
);
fs.writeFileSync(file1, content1);

const file2 = 'src/app/api/appointments/route.ts';
let content2 = fs.readFileSync(file2, 'utf8');
content2 = content2.replace(
    /createdBy: \{ select: \{ id: true, fullName: true \} \}/g,
    `createdBy: { select: { id: true, fullName: true, email: true, phone: true } }`
);
fs.writeFileSync(file2, content2);
