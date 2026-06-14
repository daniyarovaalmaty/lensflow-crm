import { OrgType, LeadStage, LeadSource } from '@prisma/client';
import * as xlsx from 'xlsx';
import prisma from '../src/lib/db/prisma';

async function main() {
    console.log("Starting import...");

    // 1. Get or create "New Eye" Organization
    let clinic = await prisma.organization.findFirst({
        where: { name: { contains: 'New Eye', mode: 'insensitive' } }
    });

    if (!clinic) {
        console.log("Creating New Eye organization...");
        clinic = await prisma.organization.create({
            data: {
                name: 'New Eye',
                type: OrgType.standalone,
            }
        });
    }
    console.log(`Using Organization: ${clinic.name} (${clinic.id})`);

    // 2. Load Excel file
    const filePath = '/Users/daniyarovaruslanovna/Downloads/Календарь записи (1).xlsx';
    console.log(`Reading ${filePath}...`);
    const workbook = xlsx.readFile(filePath);

    // 3. Extract phones from 'Календарь'
    const phoneMap = new Map<string, string>();
    const calendarSheet = workbook.Sheets['Календарь'];
    if (calendarSheet) {
        const calData = xlsx.utils.sheet_to_json<any[]>(calendarSheet, { header: 1 });
        calData.forEach(row => {
            row.forEach(cell => {
                if (typeof cell === 'string' && cell.trim().length > 5) {
                    const text = cell.replace(/\n/g, ' ').trim();
                    // Basic phone extraction
                    const phoneMatch = text.match(/(?:\+7|8)[\s\-]?\(?[789]\d{2}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
                    if (phoneMatch) {
                        const phone = phoneMatch[0].replace(/[^\d+]/g, '');
                        // Extract name (usually at the start of the string before dot or number)
                        const nameMatch = text.match(/^([А-Яа-яA-Za-z\s]+)[.,\d]/);
                        if (nameMatch) {
                            const name = nameMatch[1].trim().toLowerCase();
                            phoneMap.set(name, phone);
                        }
                    }
                }
            });
        });
        console.log(`Extracted ${phoneMap.size} unique names with phones from Календарь.`);
    }

    // 4. Parse 'пришедшие'
    const incomingSheet = workbook.Sheets['пришедшие'];
    if (!incomingSheet) {
        throw new Error("Sheet 'пришедшие' not found!");
    }

    const data = xlsx.utils.sheet_to_json<any[]>(incomingSheet, { header: 1 });
    let imported = 0;

    // Start from row index 2 (skipping header)
    for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue;

        const dateRaw = row[1];
        let dateVal = new Date();
        if (typeof dateRaw === 'number') {
            dateVal = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
        }

        const rawName = row[2];
        if (!rawName || typeof rawName !== 'string') continue;
        const name = rawName.trim();

        const diagnosis = row[3] || '';
        const rawAmount = row[4];
        let amount = 0;
        if (typeof rawAmount === 'number') {
            amount = rawAmount;
        } else if (typeof rawAmount === 'string') {
            const parsed = parseInt(rawAmount.replace(/[^\d]/g, ''), 10);
            if (!isNaN(parsed)) amount = parsed;
        }

        const comments = row[5] || '';
        const cck = row[6] || '';

        // Find phone
        const normalizedName = name.split(' ').slice(0, 2).join(' ').toLowerCase();
        let phone = '+70000000000'; // Default fallback
        for (const [k, v] of phoneMap.entries()) {
            if (k.includes(normalizedName) || normalizedName.includes(k)) {
                phone = v;
                break;
            }
        }

        const notes = `Диагноз: ${diagnosis}\nКомментарии: ${comments}\nОплатить ЦКК: ${cck}`.trim();

        // Check if lead already exists
        const existingLead = await prisma.lead.findFirst({
            where: { name: name, clinicId: clinic.id }
        });

        if (!existingLead) {
            // Create patient
            const patient = await prisma.patient.create({
                data: {
                    name: name,
                    phone: phone,
                    organizationId: clinic.id,
                    notes: notes,
                }
            });

            // Create lead
            await prisma.lead.create({
                data: {
                    name: name,
                    phone: phone,
                    source: LeadSource.manual,
                    funnel: 'retention',
                    stage: LeadStage.retention_success,
                    clinicId: clinic.id,
                    patientId: patient.id,
                    revenue: amount,
                    notes: notes,
                    createdAt: dateVal,
                }
            });
            imported++;
        }
    }

    console.log(`Import completed. Imported ${imported} new patients/leads.`);
}

main()
    .catch(e => {
        console.error("Import failed", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
