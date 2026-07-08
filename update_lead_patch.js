const fs = require('fs');

const targetFile = 'src/app/sales/calendar/page.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace(
    /name: newName,\n\s*phone: newPhone/g,
    `name: selectedPatient ? selectedPatient.name : patientSearchQuery,
                                                        phone: selectedPatient ? selectedPatient.phone : newPhone`
);

fs.writeFileSync(targetFile, content);
