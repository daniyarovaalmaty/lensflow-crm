const fs = require('fs');

// 1. Update API response
const apiFile = 'src/app/api/crm/appointments/route.ts';
let apiContent = fs.readFileSync(apiFile, 'utf8');

apiContent = apiContent.replace(
    `                doctor: { select: { id: true, fullName: true, email: true } },
                patient: true
            }
        });`,
    `                doctor: { select: { id: true, fullName: true, email: true } },
                patient: true,
                createdBy: { select: { id: true, fullName: true } }
            }
        });`
);

apiContent = apiContent.replace(
    `            duration: app.duration,
            clinic: null // we don't have clinic name easily accessible here without another join, but it's fine
        }));`,
    `            duration: app.duration,
            clinic: null, // we don't have clinic name easily accessible here without another join, but it's fine
            createdBy: app.createdBy ? { id: app.createdBy.id, fullName: app.createdBy.fullName } : null
        }));`
);

// We should also map leads
apiContent = apiContent.replace(
    `        // Combine and sort
        const combinedLeads = [...leads, ...mappedAppointments].sort((a: any, b: any) => {`,
    `        const mappedLeads = leads.map(lead => ({
            ...lead,
            createdBy: lead.assignee ? { id: lead.assignee.id, fullName: lead.assignee.fullName } : null
        }));

        // Combine and sort
        const combinedLeads = [...mappedLeads, ...mappedAppointments].sort((a: any, b: any) => {`
);

fs.writeFileSync(apiFile, apiContent);

// 2. Update CRM Calendar UI
const crmCalFile = 'src/app/sales/calendar/page.tsx';
let crmCalContent = fs.readFileSync(crmCalFile, 'utf8');

crmCalContent = crmCalContent.replace(
    `    clinic: { id: string; name: string } | null;
    duration?: number;
}`,
    `    clinic: { id: string; name: string } | null;
    duration?: number;
    createdBy?: { id: string; fullName: string } | null;
}`
);

crmCalContent = crmCalContent.replace(
    `                    {app.doctor && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 truncate">
                            <User className="w-3 h-3 text-gray-400" />
                            {app.doctor.fullName}
                        </div>
                    )}
                </div>
            </div>`,
    `                    {app.doctor && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 truncate">
                            <User className="w-3 h-3 text-gray-400" />
                            {app.doctor.fullName}
                        </div>
                    )}
                    {app.createdBy && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                            <span className="truncate">Записал(а): {app.createdBy.fullName}</span>
                        </div>
                    )}
                </div>
            </div>`
);

fs.writeFileSync(crmCalFile, crmCalContent);

console.log('CRM Calendar creator info updated.');
