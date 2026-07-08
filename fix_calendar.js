const fs = require('fs');

// 1. Update API response
const apiFile = 'src/app/api/crm/appointments/route.ts';
let apiContent = fs.readFileSync(apiFile, 'utf8');
apiContent = apiContent.replace(
    `            doctor: app.doctor ? { id: app.doctor.id, fullName: app.doctor.fullName || app.doctor.email || '' } : null,
            clinic: null // we don't have clinic name easily accessible here without another join, but it's fine
        }));`,
    `            doctor: app.doctor ? { id: app.doctor.id, fullName: app.doctor.fullName || app.doctor.email || '' } : null,
            duration: app.duration,
            clinic: null // we don't have clinic name easily accessible here without another join, but it's fine
        }));`
);
fs.writeFileSync(apiFile, apiContent);

// 2. Update CRM Calendar UI
const crmCalFile = 'src/app/sales/calendar/page.tsx';
let crmCalContent = fs.readFileSync(crmCalFile, 'utf8');

crmCalContent = crmCalContent.replace(
    `    doctor: { id: string; fullName: string } | null;
    clinic: { id: string; name: string } | null;
}`,
    `    doctor: { id: string; fullName: string } | null;
    clinic: { id: string; name: string } | null;
    duration?: number;
}`
);

crmCalContent = crmCalContent.replace(
    `                        <Clock className="w-3 h-3" />
                        {format(parseISO(app.appointmentAt), 'HH:mm')}
                    </div>`,
    `                        <Clock className="w-3 h-3" />
                        {format(parseISO(app.appointmentAt), 'HH:mm')}
                        {app.duration ? \` (\${app.duration} мин)\` : ''}
                    </div>`
);

crmCalContent = crmCalContent.replace(
    `                    <span className="font-semibold">{format(parseISO(app.appointmentAt), 'HH:mm')}</span> {app.name || 'Без имени'}`,
    `                    <span className="font-semibold">{format(parseISO(app.appointmentAt), 'HH:mm')}{app.duration ? \` (\${app.duration} мин)\` : ''}</span> {app.name || 'Без имени'}`
);

fs.writeFileSync(crmCalFile, crmCalContent);

console.log('CRM Calendar updated.');
