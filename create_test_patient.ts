import prisma from './src/lib/db/prisma';

async function main() {
    console.log('Создание тестового пациента...');
    
    // Create the test patient
    const patient = await prisma.patient.create({
        data: {
            name: 'Тестовый Пациент Анамнез',
            phone: '+7 777 000 0000',
            email: 'test@lensflow.kz',
            birthDate: new Date('1990-05-15'),
            gender: 'female',
            iin: '900515400123',
            address: 'г. Алматы, пр. Абая 1, кв. 10',
            profession: 'Программист',
            complaints: 'Жалобы на ухудшение зрения вдаль к вечеру, сухость в глазах.',
            anamnesisDisease: 'Зрение начало падать со школы. Очки носит с 15 лет.',
            anamnesisLife: 'Хронических заболеваний нет. Работает за компьютером по 8-10 часов в день.',
            allergies: 'Аллергия на пенициллин, пыльцу.',
            heredity: 'У матери миопия высокой степени, глаукома у бабушки.',
            medications: 'Искусственная слеза (Систейн Ультра) 2 раза в день.',
            dispensary: 'Не состоит.',
            surgeries: 'Аппендэктомия в 2010 году.',
            lastCorrection: 'Очки -2.50D (2022 год).',
            notes: 'Создан скриптом для тестирования новых полей анамнеза.',
        }
    });

    console.log(`Пациент создан. ID: ${patient.id}`);

    // Fetch an existing doctor to associate the consultation with, or use a dummy ID if none exists.
    const doctor = await prisma.user.findFirst({ where: { role: 'doctor' } });
    const doctorId = doctor ? doctor.id : patient.id; // Just fallback to any string

    // Create a consultation for the patient
    const consultation = await prisma.consultation.create({
        data: {
            patientId: patient.id,
            doctorId: doctorId,
            visitDate: new Date(),
            type: 'fitting',
            diagnosis: 'Миопия слабой степени обоих глаз. Синдром сухого глаза.',
            treatment: 'Рекомендован подбор мягких контактных линз. Увлажняющие капли.',
            intraocularPressureOD: 15.5,
            intraocularPressureOS: 16.0,
            visualAcuityOD: 0.8,
            visualAcuityOS: 0.9,
            // New lens fitting and refraction fields
            lensFittingOD: 'BC 8.6, DIA 14.2, PWR -2.50 (Acuvue Oasys)',
            lensFittingOS: 'BC 8.6, DIA 14.2, PWR -2.75 (Acuvue Oasys)',
            refractionOD: '-2.50 / -0.50 / 180°',
            refractionOS: '-2.75 / -0.25 / 175°',
        }
    });

    console.log(`Консультация создана. ID: ${consultation.id}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
