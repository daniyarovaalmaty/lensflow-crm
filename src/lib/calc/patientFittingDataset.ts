/**
 * Empirical Clinical Fitting Dataset trained on 231 Patients from New Eye Clinic
 * Directly extracted from Осмотр 1 clinical records (Trial kit / Suitcase / Custom Orders)
 */

export interface PatientFittingRecord {
    id: string;
    patientName: string;
    flatK: number;
    steepK: number;
    deltaK: number;
    trialLens: string;
    finalLens: string;
    isFromSuitcase: boolean;
}

export const NEW_EYE_PATIENT_DATASET: PatientFittingRecord[] = [
  {
    "id": "pt_3",
    "patientName": "Огай Валерия",
    "flatK": 43.04,
    "steepK": 43.79,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 43,0 тор1,0 OKV 10,2 42,5 тор1,0",
    "finalLens": "Заказ линз   OD 10,0 43,25 ех 0,66/0,54 тор1,0 фак+0,75 -3,5   OS 10,0 42,75 ех 0,60/0,50 фак+0,75 -3,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_4",
    "patientName": "Аскарбеков Арсен",
    "flatK": 42.05,
    "steepK": 42.8,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 42,5 тор1,5 ех0,5 -4,0 OKV 11,0 42,0 тор1,5 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD  11,0 42,0 ех 0,45/0,49 тор1,60 фак.компр 1,5 -5,5  OS 11,0 42,0 ех 0,48/0,50 тор 1,50 фак.компр 1,5 -4,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_5",
    "patientName": "Молдахмет Арслан",
    "flatK": 45.46,
    "steepK": 46.37,
    "deltaK": 0.91,
    "trialLens": "OKV 10,8 45,5 ех 0,5 тор 1,0 -4,0 OKV 11,0 45,5 ех 0,5 тор 1,0 -4,0",
    "finalLens": "Заказ линз   OD  10,8 45,5 ех 0,5 тор 1,0 -5,5  OS 10,8 45,5 ех 0,5 тор 1,0 -5,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_8",
    "patientName": "Бикинеева Мариям",
    "flatK": 43.3,
    "steepK": 44.05,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 43,0 -6,0 OKV 10,8 43,5 -6,0",
    "finalLens": "Заказ линз из набора   OD 10,8 43,0 -6,0   OS 10,8 43,5 -6,0",
    "isFromSuitcase": true
  },
  {
    "id": "pt_10",
    "patientName": "Дюсенбеков Алтынбек2",
    "flatK": 44.5,
    "steepK": 46.0,
    "deltaK": 1.5,
    "trialLens": "OKV 10,4 44,0 тор1,0 ех0,5 -4,0 OKV 10,2 44,5 тор1,0 ех0,5 -4,0",
    "finalLens": "OKV 10,4 44,0 тор1,0 ех0,5 -4,0 OKV 10,2 44,5 тор1,0 ех0,5 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_11",
    "patientName": "Кунтубаева Динара",
    "flatK": 44.36,
    "steepK": 47.24,
    "deltaK": 2.88,
    "trialLens": "OKV 10,4 44,5 тор2,0 ех0,5 OKV 10,4 44,0 тор2,0 ех0,5",
    "finalLens": "OKV 10,4 44,5 тор2,0 ех0,5 OKV 10,4 44,0 тор2,0 ех0,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_12",
    "patientName": "Сигитов Федор",
    "flatK": 43.49,
    "steepK": 45.71,
    "deltaK": 2.22,
    "trialLens": "OKV 10,4 43,0 тор2,0 OKV 10,4 43,5 тор2,0",
    "finalLens": "Заказ линз   ОД 10,20 43,50 ех 0,60 тор2,0 -5,25 DK 50 ОC 10,20 43,50 ех 0,60 тор2,0 -5,25 DK 50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_13",
    "patientName": "Асетов Алижан",
    "flatK": 40.12,
    "steepK": 40.87,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 44,0 OKV 10,8 44,5",
    "finalLens": "OKV 10,8 44,0 OKV 10,8 44,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_15",
    "patientName": "Паталахова Марина",
    "flatK": 42.24,
    "steepK": 42.69,
    "deltaK": 0.45,
    "trialLens": "OKV 10,2 42,5 ех0,5 тор0 -4,0 OKV 10,2 42,0 ех0,5 тор0 -4,0",
    "finalLens": "Заказ линз   OD 10,2 42,30 тор0 ех 0,52 -2,75   OS 10,2 42,00 тор0 ех 0,52 -2,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_16",
    "patientName": "Сансызбай Актилек",
    "flatK": 43.01,
    "steepK": 43.76,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 43,0 тор1,5 OKV 11,0 43,0 тор1,5",
    "finalLens": "Заказ линз   ОД 10,95 43,00 тор1,50 ех 0,50 -4,50 ДК 100 blue OS 10,95 43,00 tor1,50 ex 0,50 -5,00 DK 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_17",
    "patientName": "Жумагали Адия",
    "flatK": 43.95,
    "steepK": 44.7,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 44,0 тор1,0 OKV 10,2 43,0 тор1,5",
    "finalLens": "Заказ линз   OD 10,2 44,0 тор1,0 ех0,5 -4,25   OS 10,2 43,25 тор1,50 ех0,5 -3,00",
    "isFromSuitcase": false
  },
  {
    "id": "pt_18",
    "patientName": "Насурова Амина",
    "flatK": 46.51,
    "steepK": 44.84,
    "deltaK": 1.67,
    "trialLens": "OKV 10,2 46,0 тор0 ех0,50 OKV 10,4 44,0 тор2,0",
    "finalLens": "OKV 10,2 46,0 тор0 ех0,50 OKV 10,4 44,0 тор2,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_20",
    "patientName": "Ромащенко Даниил",
    "flatK": 44.5,
    "steepK": 45.75,
    "deltaK": 1.25,
    "trialLens": "OKV 10,4 44,0 тор 1,0 OKV 10,2 44,0 тор1,0",
    "finalLens": "Заказ линз   OD 10,2 44,5 ех0,57/0,52 тор1,0 фак+0,5 клир -5,0 -2,25    OS 10,2 44,5 ех0,57/0,52 тор1,0 фак+0,5 -1,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_21",
    "patientName": "Уалихан Барысхан",
    "flatK": 44.44,
    "steepK": 45.19,
    "deltaK": 0.75,
    "trialLens": "OKV 10,3 44,5 OKV 10,3 45,0",
    "finalLens": "Заказ линз   OD   10,25 44,5 ех 0,53 тор 0,69  OS 10,25 45,0 ех 0,55 тор 0,50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_23",
    "patientName": "Бозжанова Карина",
    "flatK": 42.12,
    "steepK": 42.87,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,0 тор0 ех0,5 OKV 10,8 42,5 тор0 ех0,5",
    "finalLens": "Выданы с чемодана   OD  10,8 42,0 -2,5  OS 10,8 42,5 -2,5",
    "isFromSuitcase": true
  },
  {
    "id": "pt_26",
    "patientName": "Шошина Силина",
    "flatK": 44.7,
    "steepK": 45.45,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 44,5 OKV 10,2 44,0",
    "finalLens": "Заказ линз   OD 10,35 44,5 ех 0,5 тор 0,5 -4,25    OS 10,35 44,0 ех0,52 тор0,75 -5,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_27",
    "patientName": "Акбота Сериккызы",
    "flatK": 42.26,
    "steepK": 43.01,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 42,0 тор1,0 ех0,5 -4,0 OKV 10,6 42,5 тор1,0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,6 42,25 тор1,0 ех0,54/0,51 -2,5    OS 10,6 42,5 тор1,0 ех0,54/0,50 клир+5,0 -2,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_29",
    "patientName": "Амангелды Даниал",
    "flatK": 42.62,
    "steepK": 44.45,
    "deltaK": 1.83,
    "trialLens": "OKV 10,6 42,5 тор1,5 ех0,5 -4,0 OKV 10,4 42,5 тор1,0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,48 42,5 тор1,63 ех0,54/0,56 клиренс 5 мкм -3,5    OS 10,48 42,70 ех 0,54/0,53 тор1,12 -3,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_31",
    "patientName": "Игнатович Василиса",
    "flatK": 44.31,
    "steepK": 46.29,
    "deltaK": 1.98,
    "trialLens": "OKV 10,4 44,0 тор 2,0 OKV 10,6 44,0 тор1,5",
    "finalLens": "OKV 10,4 44,0 тор 2,0 OKV 10,6 44,0 тор1,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_32",
    "patientName": "Мадалиева Медина",
    "flatK": 41.81,
    "steepK": 44.62,
    "deltaK": 2.81,
    "trialLens": "OKV 10,4 41,5 тор 2,0 OKV 10,4 41,0 тор 2,0",
    "finalLens": "OKV 10,4 41,5 тор 2,0 OKV 10,4 41,0 тор 2,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_33",
    "patientName": "Долгих Яника",
    "flatK": 42.0,
    "steepK": 42.75,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,0 тор0 OKV 10,8 41,5 тор0",
    "finalLens": "Заказ линз   OD 11,10 42,0 тор0 ех0,5 апик+2,0 -2,75    OS 11,10 41,5 ех0,47 апик+2,0 -1,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_35",
    "patientName": "Курноскин Даниэль",
    "flatK": 43.57,
    "steepK": 44.32,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 43,5 тор1,0 OKV 10,8 43,5",
    "finalLens": "Заказ линз   OD  10,85 43,5 тор1,0 ех0,50 -5,25  OS 10,85 43,50 тор0,75 ех0,50 -5,50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_37",
    "patientName": "Оразкулова Жулдыз",
    "flatK": 43.25,
    "steepK": 44.0,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 43,0 тор1,0 OKV 10,4 43,5 тор 1,5",
    "finalLens": "Заказ линз   OD  10,4 43,0 тор 1,0 ех 0,50 -5,0  OS 10,4 43,5 тор 1,5 ех 0,50 -4,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_39",
    "patientName": "Алдыбаев Телмужин",
    "flatK": 41.25,
    "steepK": 43.0,
    "deltaK": 1.75,
    "trialLens": "OKV 10,6 41,0 тор1,5 OKV 10,4 41,0 тор1,5",
    "finalLens": "OKV 10,6 41,0 тор1,5 OKV 10,4 41,0 тор1,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_40",
    "patientName": "Дюсенбеков Алтынбек",
    "flatK": 44.5,
    "steepK": 46.0,
    "deltaK": 1.5,
    "trialLens": "OKV 10,4 44,0 тор1,0 ех0,5 -4,0 OKV 10,2 44,5 тор1,0 ех0,5 -4,0",
    "finalLens": "OKV 10,4 44,0 тор1,0 ех0,5 -4,0 OKV 10,2 44,5 тор1,0 ех0,5 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_42",
    "patientName": "Безьязычных Мия",
    "flatK": 45.7,
    "steepK": 46.45,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 46,0 OKV 10,6 45,5",
    "finalLens": "Заказ линз   OD 10,60 46,00 тор0 ех 0,50 -3,50 DK 100 blue OS 10,60 45,50 тор0 ех 0,50 -3,50 DK 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_44",
    "patientName": "Тлеубердин Айрим",
    "flatK": 43.81,
    "steepK": 45.56,
    "deltaK": 1.75,
    "trialLens": "OKV 10,4 44,0 тор 1,5 ех 0,5 OKV 10,4 43,5 тор2,0 ех 0,50",
    "finalLens": "Заказ линз  ОД 10,40 43,50 тор 1,50 ех 0,50 -7,75 ДК 100 blue ОC 10,40 43,00 тор 2,0 ех 0,50  -7,75 ДК 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_45",
    "patientName": "Ждеуова Ботагоз",
    "flatK": 43.35,
    "steepK": 44.1,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 43,5 тор1,5 ех0,5 -4,0 OKV 10,2 43,0 тор1,5 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,07 43,30 тор 1,85 ех 0,54/0,56 фак 1,0 клир -3,0  ТР -4,0  OS 10,07 43,25 тор 1,5 ех 0,55/0,56 ТР -3,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_46",
    "patientName": "Дербенцев Марк",
    "flatK": 42.55,
    "steepK": 43.3,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 42,5 ех0,5 тор1,5 -4,0 OKV 10,6 43,0 ех0,5 тор1,5 -4,0",
    "finalLens": "Заказ линз   OD  10,46 42,60 ех 0,5/0,52 тор1,5 фактор 1,0 -3,75  OS 10,46 43,10 ех0,5/0,51 тор1,5 фактор 1,0 -3,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_50",
    "patientName": "Отебай Каусар",
    "flatK": 42.52,
    "steepK": 43.98,
    "deltaK": 1.46,
    "trialLens": "OKV 10,6 42,0 тор1,5 OKV 10,4 42,5 тор1,5",
    "finalLens": "OKV 10,6 42,0 тор1,5 OKV 10,4 42,5 тор1,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_52",
    "patientName": "Худайкулов Даллер",
    "flatK": 42.5,
    "steepK": 43.87,
    "deltaK": 1.37,
    "trialLens": "OKV 10,4 42,0 тор1,0 ех0,5 OKV 10,6 42,0 тор1,0 ех0,5",
    "finalLens": "Заказ линз  OD 10,40 42,00 ex0,52 tor1,0 apik+5,0 -3,25 DK 100 blue OS 10,40 42,00 ex0,52 tor1,0 -3,00 DK 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_55",
    "patientName": "Хасан Карина",
    "flatK": 44.08,
    "steepK": 44.83,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 43,50 тор1,0 OKV 10,2 43,50 тор1,0",
    "finalLens": "Заказ линз   OD 10,25 43,50 тор1,0 ех0,50 апик +5,0 -1,25     OS 10,20 43,50 тор1,0 ех0,52 -1,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_57",
    "patientName": "Рысбек Нурали",
    "flatK": 42.85,
    "steepK": 43.6,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 43,0 тор 1,0 OKV 10,6 43,0 тор 1,5",
    "finalLens": "Заказ линз   OD 10,6 43,00 tor 1,50 ex 0,50 -5,50 DK 100 blue OS  10,6 43,00 tor 1,50 ex 0,45 -5,75 DK 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_58",
    "patientName": "Меркурьев Виталий",
    "flatK": 41.28,
    "steepK": 43.02,
    "deltaK": 1.74,
    "trialLens": "OKV 11,0 41,5 тор1,5 OKV 11,0 41,0 тор 1,5",
    "finalLens": "OKV 11,0 41,5 тор1,5 OKV 11,0 41,0 тор 1,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_60",
    "patientName": "Алимхан Мерей",
    "flatK": 42.06,
    "steepK": 42.81,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 41,5 тор0 ех 0,50 OKV 11,0 41,5 тор1,0 ех 0,50",
    "finalLens": "Заказ линз   ОД 11,00 42,00 тор 0,75 ех 0,52/0,47  -5,75 ДК 100 green ОC 11,00 42,00 тор 1,0 ех 0,50/0,47 -5,75 DK 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_61",
    "patientName": "Кобельский Радислав",
    "flatK": 43.2,
    "steepK": 45.83,
    "deltaK": 2.63,
    "trialLens": "OKV 10,4 43,0 тор2,0 OKV 10,4 43,5 тор2,0",
    "finalLens": "OKV 10,4 43,0 тор2,0 OKV 10,4 43,5 тор2,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_63",
    "patientName": "Дастанов Ержан",
    "flatK": 41.97,
    "steepK": 42.72,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 42,0 тор1,5 OKV 10,8 42,0 тор1,5",
    "finalLens": "Заказ линз   OD 10,9 42,0 тор1,40 ех0,52 -3,50    OS 10,9 42,0 тор1,40 ех0,52 -3,50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_64",
    "patientName": "Рауанулы Алинур",
    "flatK": 43.45,
    "steepK": 45.27,
    "deltaK": 1.82,
    "trialLens": "OKV 10,2 43,5 тор1,0 OKV",
    "finalLens": "OKV 10,2 43,5 тор1,0 OKV",
    "isFromSuitcase": false
  },
  {
    "id": "pt_65",
    "patientName": "Кетегенова Амина",
    "flatK": 43.52,
    "steepK": 46.32,
    "deltaK": 2.8,
    "trialLens": "OKV 10,4 43,5 тор 1,5 OKV 10,4 43,0 тор2,0",
    "finalLens": "OKV 10,4 43,5 тор 1,5 OKV 10,4 43,0 тор2,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_67",
    "patientName": "Елеу Акмарал",
    "flatK": 43.37,
    "steepK": 44.78,
    "deltaK": 1.41,
    "trialLens": "OKV 10,4 43,5 тор1,5 OKV 10,2 43,5 тор1,5",
    "finalLens": "OKV 10,4 43,5 тор1,5 OKV 10,2 43,5 тор1,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_69",
    "patientName": "Кандалов Сергей",
    "flatK": 43.08,
    "steepK": 43.0,
    "deltaK": 0.08,
    "trialLens": "OKV 10,2 42,5 OKV 10,2 43,0",
    "finalLens": "Заказ линз   OD 10,05 42,5 ех0,50 тор0 -1,25 green   OS 10,05 43,0 ех0,50 тор0  -1,50 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_70",
    "patientName": "Нурумова Еркеназ",
    "flatK": 43.81,
    "steepK": 44.56,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 44,0 -6,0 OKV 10,8 44,0 -5,0",
    "finalLens": "Заказ линз  с набора выданы OD  10,8 44,0 -6,0 гол   OS 10,8 44,0 -5,0 зел",
    "isFromSuitcase": true
  },
  {
    "id": "pt_72",
    "patientName": "Жумагалиева Актолкын",
    "flatK": 42.71,
    "steepK": 43.46,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 43,0 тор1,5 OKV 10,4 43,0 тор2,0",
    "finalLens": "Заказ линз   OD  10,5 43,0 ех0,5 тор1,5 -6,0  OS 10,5 43,0 тор1,75 -5,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_73",
    "patientName": "Курманбек Имран",
    "flatK": 44.11,
    "steepK": 44.86,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 44,0 тор1,0 OKV 10,4 44,0 тор 1,0",
    "finalLens": "Заказ линз   OD 10,4 44,0 тор1,0 ех 0,48/0,42 апик -3,0 фак+1,0  -6,25  OS 10,4 44,0 тор1,0 ех0,48/0,42 апик -3,0 фак+1,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_75",
    "patientName": "Муратов Ильяс",
    "flatK": 42.4,
    "steepK": 43.15,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 42,5 тор1,0 OKV 11,0 42,0 тор1,0",
    "finalLens": "Заказ линз   OD 10,95 42,5 тор1,0 ех 0,52 -1,75    OS 10,95 42,0 тор1,10 ех0,50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_76",
    "patientName": "Аликенов Дастан",
    "flatK": 42.38,
    "steepK": 43.13,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 42,5 тор1,0 OKV 10,8 42,5 тор1,0",
    "finalLens": "Заказ линз   OD 10,95 42,50 тор1,0 ех0,50 -4,25   OS 10,95 42,50 тор1,0 ех0,50 -3,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_77",
    "patientName": "Кибирова Рамина",
    "flatK": 44.44,
    "steepK": 45.8,
    "deltaK": 1.36,
    "trialLens": "OKV 10,2 44,5 тор 1,0 OKV 10,2 45,0 тор1,0",
    "finalLens": "Заказ линз   OD 10,0 44,5 тор1,25 ех0,48 -4,0    OS 10,0 45,0 тор0,80 ех0,48 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_78",
    "patientName": "Жумахан Ерсултан",
    "flatK": 43.06,
    "steepK": 43.81,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 43,0 тор1,5 OKV 10,4 43,5 тор1,0",
    "finalLens": "Заказ линз   OD   10,4 43,0 тор1,5 ех 0,50 -2,75  OS  10,4 43,50 тор1,0 ех 0,50 -3,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_79",
    "patientName": "Перетьятко Полина",
    "flatK": 43.56,
    "steepK": 44.31,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 43,5 тор2,0 ех0,5 -4,0 OKV 10,4 44,0 тор1,5 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,25 43,50 тор 1,75 ех 0,57/0,60 -3,75   OS 10,30 44,0 тор1,5 ех 0,57/0,62 -6,75 фак.компрессии 1,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_80",
    "patientName": "Торебай Айлин",
    "flatK": 44.53,
    "steepK": 45.28,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 44,5 ех 0,5 тор1,0 -4,0 OKV 10,2 44,0 ех 0,5 тор1,0 -4,0",
    "finalLens": "Заказ линз   OD  10,15 44,5 ех 0,53/0,47 тор1,0 фак+1,0 -3,0  OS 10,15 44,0 ех 0,53/0,47 тор1,0 фак+1,0 -2,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_83",
    "patientName": "Саятбек Жамиля",
    "flatK": 43.35,
    "steepK": 44.1,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 43,0 тор1,0 OKV 10,2 43,50 тор1,0",
    "finalLens": "Заказ линз   OD 10,15 43,25 ех0,50 тор0,75 -2,25   OS 10,15 43,50 ех0,45 тор0,75 -2,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_84",
    "patientName": "Рожков Роман",
    "flatK": 42.12,
    "steepK": 44.15,
    "deltaK": 2.03,
    "trialLens": "OKV 11,0 42,5 тор1,5 OKV 11,0 42,0 тор1,5",
    "finalLens": "OKV 11,0 42,5 тор1,5 OKV 11,0 42,0 тор1,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_85",
    "patientName": "Жумакара Каусар",
    "flatK": 43.55,
    "steepK": 44.3,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 43,5 тор1,0 ех0,5 OKV 10,4 43,0 тор1,0 ех0,5",
    "finalLens": "Заказ линз   OD 10,40 43,50 тор1,0 ех0,52 -2,0 DK 100 green с черной надп    OS 10,40 43,00 ex0,50 tor1,0 -3,50 DK 100 green",
    "isFromSuitcase": false
  },
  {
    "id": "pt_86",
    "patientName": "Рахым Ансаган",
    "flatK": 40.8,
    "steepK": 43.14,
    "deltaK": 2.34,
    "trialLens": "OKV 11,0 41,0 ех0,5 тор1,5 -4,0 OKV 10,8 41,0 ех0,5 тор1,5 -4,0",
    "finalLens": "OKV 11,0 41,0 ех0,5 тор1,5 -4,0 OKV 10,8 41,0 ех0,5 тор1,5 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_87",
    "patientName": "Алимхан Аман",
    "flatK": 42.0,
    "steepK": 42.75,
    "deltaK": 0.75,
    "trialLens": "OKV  10,8 42,0 тор0 ех0,50 OKV 10,8 41,5 тор 1,0 ех 0,50",
    "finalLens": "Заказ линз   OD   ОД 10,90 42,00 тор 0,50 ех 0,50 -4,00 ДК 100 blue ОС 10,90 41,50 тор 1,0 ех 0,50 -3,75 ДК 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_88",
    "patientName": "Асылжан Альмахан",
    "flatK": 41.3,
    "steepK": 42.05,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 42,0 тор 2,0 ех0,5 -4,0 OKV 10,4 41,5 тор 2,0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD  10,25 41,5 ех 0,53/0,52 тор2,25   фак 1,0 -4,25  OS 10,27 41,5 тор2,0 ех 0,52/0,49 фак 1,0 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_89",
    "patientName": "Мурзабекова Карина",
    "flatK": 45.0,
    "steepK": 45.75,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 45,0 тор1,5 OKV 10,2 45,5 тор1,5",
    "finalLens": "Заказ линз   OD  10,0 45,0 тор1,5 ех0,5 -2,75  OS 10,0 45,5 тор1,60 ех0,5 -2,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_90",
    "patientName": "Аймаканбетова Айдана",
    "flatK": 45.25,
    "steepK": 46.25,
    "deltaK": 1.0,
    "trialLens": "OKV 10,8 45,0 тор 1,0 ех0,5 -4,0 OKV 10,6 45,0 ех0,5 тор1,0 -4,0",
    "finalLens": "Заказ линз   OD 10,45 45,0 ех0,5 тор1,25 апик+3,0 фактор+1,5 -5,0    OS 10,45 45,25 ех0,5 тор 1,25 апик +3,0 фактор 1,5 -5,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_91",
    "patientName": "Орынгали Аяна",
    "flatK": 42.26,
    "steepK": 43.01,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 42,0 тор1,5 OKV 10,2 42,5 тор1,0",
    "finalLens": "OKV 10,2 42,0 тор1,5 OKV 10,2 42,5 тор1,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_94",
    "patientName": "Ахмет Инкар",
    "flatK": 44.53,
    "steepK": 45.28,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 44,5 тор1,5 OKV 10,4 44,5 тор1,5",
    "finalLens": "Заказ линз  OD 10,40 44,5 ex0,52/0,50 tor 1,5 -5,0 green DK 100 OS 10,40 44,5 ex0,5 tor 1,5 -4,75 violet DK 100",
    "isFromSuitcase": false
  },
  {
    "id": "pt_95",
    "patientName": "Жаксыбек Тогжан",
    "flatK": 42.31,
    "steepK": 43.06,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,0 ех0,5 тор1,0 -4,0 OKV 10,6 42,0 ех0,5 тор1,0",
    "finalLens": "Заказ линз   OD 10,55 42,25 тор1,0 ех0,54/0,52 -4,75 фак компр 1,5  OS 10,55 42,00 тор1,0 ех0,54/0,52 -4,25 фак компр 1,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_97",
    "patientName": "Копия Секишев Турар",
    "flatK": 42.48,
    "steepK": 43.23,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 43,0 тор1,5 OKV 10,8 42,5 тор1,5",
    "finalLens": "Заказ линз   OD 10,70 42,50 ех0,42 тор1,5 -3,50 DK 50    OS 10,65 ex0,46 tor1,5 apik +5,0 -3,25 DK 50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_100",
    "patientName": "Полатбек Арай",
    "flatK": 43.08,
    "steepK": 43.83,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 43,5 тор1,5 OKV 10,8 43,5 тор1,5",
    "finalLens": "Заказ линз   OD  11,10 43,00 ех 0,43 тор1,5 -2,75  OS 11,10 43,00 ех 0,44 тор1,5 -2,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_101",
    "patientName": "Туманова Таисия",
    "flatK": 44.4,
    "steepK": 45.15,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 44,5 OKV 10,4  44,0 тор1,0",
    "finalLens": "Заказ линз   OD 10,4 44,5 ех0,46 -2,75    OS 10,4 44,0 тор1,20 ех0,50/0,48 -2,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_102",
    "patientName": "Ауесханова Мерей",
    "flatK": 41.38,
    "steepK": 43.18,
    "deltaK": 1.8,
    "trialLens": "OKV 10,6 41,0 тор1,0 ех0,5 -4,0 OKV 10,4 41,0 тор1,0 ех0,5 -4,0",
    "finalLens": "OKV 10,6 41,0 тор1,0 ех0,5 -4,0 OKV 10,4 41,0 тор1,0 ех0,5 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_103",
    "patientName": "Долгорукова Элияна",
    "flatK": 42.38,
    "steepK": 43.13,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,50 OKV 10,8 42,50",
    "finalLens": "Заказ линз   OD  10,9 42,5 ех0,5 тор0 -4,0 фактор + 0,75  OS 10,9 43,00 ех 0,58 -4,25 фактор +0,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_104",
    "patientName": "Притчина Дарина",
    "flatK": 43.59,
    "steepK": 44.34,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 43,5 тор1,0 OKV 10,6 43,0 тор1,0",
    "finalLens": "Заказ линз   OD 10,6 43,50 тор1,0 ех0,5 -4,0    OS 10,6 43,00 тор1,0 ех0,5 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_105",
    "patientName": "Медеу Мирас",
    "flatK": 44.75,
    "steepK": 47.25,
    "deltaK": 2.5,
    "trialLens": "OKV 10,4 44,5 тор2,0 OKV 10,2 44,5 тор1,5",
    "finalLens": "OKV 10,4 44,5 тор2,0 OKV 10,2 44,5 тор1,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_106",
    "patientName": "Иваненко Екатерина",
    "flatK": 44.48,
    "steepK": 45.23,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 44,5 тор1,0 OKV 10,2 45,0 тор1,0",
    "finalLens": "Заказ линз   OD  10,15 44,5 тор1,0 ех0,49 -5,25  OS 10,15 45,0 тор1,20 ех0,49 -4,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_107",
    "patientName": "Нуртажиев Алдияр",
    "flatK": 42.88,
    "steepK": 43.63,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 43,0 тор1,0 ех0,50 OKV 10,2 42,5 тор1,0 ех0,50",
    "finalLens": "Заказ линз  OD 10,30 43,00 tor0,85 ex0,52 -3,0 DK100 blue OS 10,30 43,00 tor0,75 ex0,53 -2,75 DK100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_108",
    "patientName": "Новикова Мария",
    "flatK": 44.0,
    "steepK": 44.75,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 44,0 OKV 10,2 43,5",
    "finalLens": "Заказ линз   OD   10,0 44,0 0,56 -1,75  OS 10,0 44,0 0,56 -1,50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_109",
    "patientName": "Сабит Куралай",
    "flatK": 41.7,
    "steepK": 43.3,
    "deltaK": 1.6,
    "trialLens": "OKV 10,6 42,0 тор1,5 ex0,5 -4,0 OKV 10,4 42,0 тор1,5 ex0,5 -4,0",
    "finalLens": "OKV 10,6 42,0 тор1,5 ex0,5 -4,0 OKV 10,4 42,0 тор1,5 ex0,5 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_111",
    "patientName": "Копия Туманова Таисия",
    "flatK": 44.4,
    "steepK": 45.15,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 44,5 OKV 10,4  44,0 тор1,0",
    "finalLens": "Заказ линз   OD 10,4 44,5 ех0,46 -2,75    OS 10,4 44,0 тор1,20 ех0,50/0,48 -2,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_112",
    "patientName": "Ексилова Данара",
    "flatK": 43.42,
    "steepK": 44.17,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 43,5 тор1,0 OKV 10,2 43,5 тор1,5",
    "finalLens": "Заказ линз   ОД 10,10 43,50 тор1,25 ех 0,50 -7,0 ДК 125 blue ОД 10,10 43,50 тор1,40 ех 0,50 -7,25 ДК 125 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_113",
    "patientName": "Садыков Самир",
    "flatK": 43.29,
    "steepK": 44.04,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 43,5 тор1,5 ех0,5 -4,0 OKV 10,8 43,5 тор1,5 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,6 43,25 тор 1,75 ех 0,47/0,50 апик-3,0 фактор +1,5 -5,25    OS 10,6 43,5 тор1,5 ех 0,5/0,51 фак1,5 -4,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_115",
    "patientName": "Щока Мария",
    "flatK": 44.23,
    "steepK": 44.98,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 44,5 тор1,0 ех 0,5 -4,0 OKV 10,6 45,0 тор 1,0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,5 44,0 ех0,42 тор 1,15 -5,25    OS 10,5 44,5 ех0,42 тор1,30 -5,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_117",
    "patientName": "Клейтон София",
    "flatK": 43.5,
    "steepK": 44.25,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 43,50 OKV 10,8 44,0",
    "finalLens": "Заказ линз   OD 11,05 43,50 ex0,51  -2,0 DK 100 blue  OS 11,05 44,00 ex0,51 apik+5,0  -1,75 DK 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_120",
    "patientName": "Рахимова Сафира",
    "flatK": 42.87,
    "steepK": 44.62,
    "deltaK": 1.75,
    "trialLens": "OKV 10,4 43,0 тор2,0 OKV 10,4 43,5 тор2,0",
    "finalLens": "Заказ линз   OD 10,4 43,25 ех0,5 тор2,0 -8,0 фактор+2,0 ДК 125    OS 10,4 43,0 ех 0,42 тор2,0 -7,5 фактор +2,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_121",
    "patientName": "Нургаликызы Айлун",
    "flatK": 43.7,
    "steepK": 44.45,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 44,0 тор2,0 OKV 10,6 43,5 тор1,5",
    "finalLens": "Заказ линз   OD 10,6 43,50 тор2,15 ех0,40/0,48 -2,25   OS 10,6 43,5 тор1,60 ех0,49 -1,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_123",
    "patientName": "Максименко Ольга",
    "flatK": 43.7,
    "steepK": 44.45,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 44,0 ех0,5 тор1,0 -4,0 OKV 10,8 44,0 ех0,5 тор1,0 -4,0",
    "finalLens": "Заказ линз   OD 11,0 44,0 ех0,52/0,48 тор 0,75 -2,75   OS 11,0 44,0 ех0,52/0,48 тор0,75 -2,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_125",
    "patientName": "Мухамеднепес Зере",
    "flatK": 44.0,
    "steepK": 44.5,
    "deltaK": 0.5,
    "trialLens": "OKV 10,2 43,5 тор1,0 ех0,5 -4,0 OKV 10,2 44,0 тор1,0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,05 44,0 ех0,56/0,49 тор 1,25 апик -2,0 ТР -3,0    OS 10,05 44,0 ех 0,60/0,54 тор1,0 -1,5 фак +0,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_128",
    "patientName": "Ертай Адиля",
    "flatK": 43.83,
    "steepK": 44.58,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 44,0 тор1,5 OKV 10,4 43,0 тор2,0",
    "finalLens": "OKV 10,2 44,0 тор1,5 OKV 10,4 43,0 тор2,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_130",
    "patientName": "Артомонов Михаил",
    "flatK": 43.31,
    "steepK": 44.0,
    "deltaK": 0.69,
    "trialLens": "OKV 10,2 43,0 тор0 ех0,5 -4,0 OKV",
    "finalLens": "Заказ линз   OD  10,2 43,25 ех0,58 тор0 -2,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_131",
    "patientName": "Досболов Наби",
    "flatK": 41.38,
    "steepK": 42.86,
    "deltaK": 1.48,
    "trialLens": "OKV 10,6 41,0 тор1,0 OKV 10,6 41,0 тор1,50",
    "finalLens": "OKV 10,6 41,0 тор1,0 OKV 10,6 41,0 тор1,50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_137",
    "patientName": "Мацковская Анастасия",
    "flatK": 43.66,
    "steepK": 44.4,
    "deltaK": 0.74,
    "trialLens": "OKV 10,6 44,0 ех0,5 тор1,0 -4,0 OKV 10,6 43,5 ех0,5 тор1,0 -4,0",
    "finalLens": "Заказ линз   OD 10,55 44,0 ех0,53 тор1,0 -4,5   OS 10,55 ех 0,53 тор1,0 -4,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_140",
    "patientName": "Ексилов Ерсултан",
    "flatK": 42.86,
    "steepK": 43.61,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 43,0 OKV 10,3 43,0",
    "finalLens": "Заказ линз  ОД 10,10 43,00 тор0,85 ех 0,50 -7,5 ДК 125 blue ОС 10,10 43,00 тор0,75 ех 0,50 -7,5 ДК 125 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_143",
    "patientName": "Ниязова Александра",
    "flatK": 43.78,
    "steepK": 44.53,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 44,0 тор1,0 ех0,5 -4,0 OKV 10,4 44,0 тор1,0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,6  44,0 тор1,0 ех 0,53/0,54 -6,75    OS 10,6 43,85 ех0,54/0,55 тор1,20",
    "isFromSuitcase": false
  },
  {
    "id": "pt_144",
    "patientName": "Шарабок Анастасия",
    "flatK": 42.0,
    "steepK": 42.75,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 43,0 тор1,0 ех 0,5 -4,0 OKV 11,0 43,5 тор1,0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD 11,0 42,0 ех 0,39/0,36 тор1,0 апик +5,0 -1,0    OS 11,0 42,5 ех0,40/0,37 тор1,0 -1,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_145",
    "patientName": "Нуртажиев Амир",
    "flatK": 43.5,
    "steepK": 44.62,
    "deltaK": 1.12,
    "trialLens": "OKV 10,2 43,50 тор1,0 ех0,50 OKV 10,2 43,00 тор1,0 ех0,50",
    "finalLens": "Заказ линз   OD 10,05 43,50 tor1,0 ex0,53 -4,75 fak +1,5 DK100 green  OS 10,05 43,50 tor1,0 ex0,53 -5,75 fak +1,5 DK100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_146",
    "patientName": "Касымбекова Ботагоз",
    "flatK": 41.22,
    "steepK": 41.97,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 41,0 ех 0,5 тор0 -4,0 OKV 10,2 41,0 ех 0,5 тор0 -4,0",
    "finalLens": "Заказ линз   OD   10,15 41,25 ех0,53 тор0 -5,0 фактор 1,75 клир +3,0  OS 10,15 41,25 ех 0,53 фактор 1,75 клир +3,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_148",
    "patientName": "Ахмет Аниса",
    "flatK": 43.98,
    "steepK": 44.73,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 44,0 тор1,0 ех 0,5 OKV 10,6 43,50 тор1,5 ех 0,5",
    "finalLens": "OKV 10,6 44,0 тор1,0 ех 0,5 OKV 10,6 43,50 тор1,5 ех 0,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_149",
    "patientName": "Маневич Дамиль",
    "flatK": 42.97,
    "steepK": 43.72,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 43,0 тор1,0 OKV 10,4 43,0 тор1,0",
    "finalLens": "Заказ линз   OD 10,46 43,0 ех0,5 тор1,0 -2,75 blue    OS 10,46 43,0 ex0,5 тор1,0 -3,0 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_152",
    "patientName": "Шернияз Зейн",
    "flatK": 43.79,
    "steepK": 44.54,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 43,5 -2,5 OKV 10,8 43,0 -3,0",
    "finalLens": "Заказ линз   OD 10,68 43,75 ех0,54 -2,5    OS 10,68 43,0 ех0,50 -2,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_154",
    "patientName": "Жолболсын Арман",
    "flatK": 43.85,
    "steepK": 44.6,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 44,0 тор1,5 ех0,5 -4,0 OKV 10,4 44,0 тор1,0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD  10,4 44,0 ех0,54 тор 1,40 -1,5  OS 10,4 44,0 ех 0,57/0,54 тор 1,0 -1,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_157",
    "patientName": "Торекелды Амир(АвтоматическиВосстановлено)",
    "flatK": 43.92,
    "steepK": 44.67,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 44,0 OKV 10,8 43,50",
    "finalLens": "Заказ линз   OD 10,50 44,0 ех 0,5 -4,25   OS 10,50 43,50 ех0,5 -4,25 апик +5,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_158",
    "patientName": "Мирболаткызы Коркем",
    "flatK": 42.78,
    "steepK": 43.53,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,50 OKV 10,8 42,0",
    "finalLens": "OKV 10,8 42,50 OKV 10,8 42,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_160",
    "patientName": "Ерубек Айша",
    "flatK": 41.31,
    "steepK": 42.06,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 41,0 тор1,5 ех0,5 -4,0 OKV 11,0 41,5 тор1,5 ех0,5 -4,0",
    "finalLens": "OKV 11,0 41,0 тор1,5 ех0,5 -4,0 OKV 11,0 41,5 тор1,5 ех0,5 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_161",
    "patientName": "Кенжебекова Алтынай",
    "flatK": 42.56,
    "steepK": 42.91,
    "deltaK": 0.35,
    "trialLens": "OKV 11,0 42,5 тор1,0 ех0,5 -4,0 OKV 10,8 42,5 тор1,0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD  10,9 42,75 тор0,55 ех 0,48/0,46 -1,25  OS 10,9 42,75 тор0,55 ех 0,48/0,46 -1,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_164",
    "patientName": "Сакович Наталья",
    "flatK": 42.13,
    "steepK": 42.88,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 42,0 ех0,5 тор 1,5 -4,0 OKV 10,2 42,0 ех 0,5 тор 1,5 -4,0",
    "finalLens": "Заказ линз   OD  10,35 42,25 ех 0,53 тор 1,60 апик +4,0 -2,5  OS 10,35 42,15 ех0,50/0,51 тор 1,5 апик +4,0 -3,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_165",
    "patientName": "Ринатулы Булхаирхан",
    "flatK": 43.24,
    "steepK": 43.99,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 43,0 тор1,0 OKV 10,4 43,0 тор1,0",
    "finalLens": "OKV 10,2 43,0 тор1,0 OKV 10,4 43,0 тор1,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_167",
    "patientName": "Талгат Ансар",
    "flatK": 42.29,
    "steepK": 43.04,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,5 тор1,5 OKV 10,6 42,5 тор1,5",
    "finalLens": "Заказ линз   OD  10,8 42,5ех 0,50 тор1,5 -5,50    OS 10,8 42,5ех 0,50 тор1,5 -5,50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_168",
    "patientName": "Вельсимова Ирада",
    "flatK": 44.01,
    "steepK": 44.76,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 44,0 тор0 ех0,5 -4,0 OKV 10,2 44,5 тор0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD  10,05 44,25 ех0,55 -6,0  OS 10,05  ех 0,56 -5,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_169",
    "patientName": "Еркин Айару",
    "flatK": 42.44,
    "steepK": 43.19,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 42,5 ех0,5 тор1,5 -4,0 OKV 10,8 42,5 тор1,5 -4,0",
    "finalLens": "OKV 11,0 42,5 ех0,5 тор1,5 -4,0 OKV 10,8 42,5 тор1,5 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_170",
    "patientName": "Ермек Молдир",
    "flatK": 42.29,
    "steepK": 43.04,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,0 ех 0,5 -4,0 OKV 10,6 42,0 тор1,0 ех 0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,65 42,0 ех0,5 фактор 0,5 клир +5,0 -3,0   OS 10,65 42,0 ех 0,53/0,50 тор1,0 апик +5,0 -3,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_172",
    "patientName": "Магаз Амаль",
    "flatK": 41.97,
    "steepK": 42.72,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42 тор1,5 OKV 10,6 42,0 тор1,5",
    "finalLens": "Заказ линз   OD 10,67 42,0 тор1,5 ех0,50 -3,50    OS 10,67 42,0 тор1,65 ех0,50 -3,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_173",
    "patientName": "Гордеев Мирон",
    "flatK": 43.25,
    "steepK": 44.0,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 43,50 OKV 10,2 43,00",
    "finalLens": "Заказ линз   OD 10,2 43,50 ех 0,50 -1,75   OS 10,2 43,25 ех 0,50 -2,00",
    "isFromSuitcase": false
  },
  {
    "id": "pt_177",
    "patientName": "Махаметжанова Михрина",
    "flatK": 41.62,
    "steepK": 42.37,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 41,0 ех0,5 OKV 10,8 41,5 ех 0,5",
    "finalLens": "Заказ линз  ОД 10,80 41,50 ех 0,60 -2,75 blue DK 100 ОС 10,80 41,50 ех 0,58 -2,50 violet DK 100",
    "isFromSuitcase": false
  },
  {
    "id": "pt_178",
    "patientName": "Аданов Маджит",
    "flatK": 40.84,
    "steepK": 41.58,
    "deltaK": 0.74,
    "trialLens": "OKV 10,8 40,5 тор0 ех0,5 OKV 10,8 41,0 тор0 ех0,5",
    "finalLens": "OKV 10,8 40,5 тор0 ех0,5 OKV 10,8 41,0 тор0 ех0,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_179",
    "patientName": "Раимов Тамерлан",
    "flatK": 42.59,
    "steepK": 44.15,
    "deltaK": 1.56,
    "trialLens": "OKV 43,0 11,0 ех0,5 тор1,0 -4,0 OKV 42,5 11,0 ех0,5 тор1,0 -4,0",
    "finalLens": "OKV 43,0 11,0 ех0,5 тор1,0 -4,0 OKV 42,5 11,0 ех0,5 тор1,0 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_180",
    "patientName": "Бауыржан Айару",
    "flatK": 41.79,
    "steepK": 42.54,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 42,0 тор1,0 ех0,5 OKV 10,4 42,0 тор1,0 ех0,5",
    "finalLens": "Заказ линз  OD 10,45 42,00 ex 0,50 tor1,0 -2,50 DK 100 blue OS 10,45 42,00 ex 0,50 tor1,10 -1,75 DK 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_181",
    "patientName": "Тазбек Айлин",
    "flatK": 41.57,
    "steepK": 42.32,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 41,0 тор1,0 ех0,5 -4,0 OKV 10,6 40,5 тор 1,5 ех0,5 -4,0",
    "finalLens": "OKV 10,8 41,0 тор1,0 ех0,5 -4,0 OKV 10,6 40,5 тор 1,5 ех0,5 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_182",
    "patientName": "Мацковская Ксения",
    "flatK": 44.05,
    "steepK": 44.83,
    "deltaK": 0.78,
    "trialLens": "OKV 10,6 44,0 тор1,0 ех0,5 -4,0 OKV 10,8 44,0 тор1,0 ех0,5 -4,0",
    "finalLens": "Заказ линз   OD  10,6 44,0 ех 0,5 тор 0,80 фак компр 1,0 -5,25  OS 10,6 44,25 ех 0,52 тор 0,75 -5,25 фак компр 1,0 клиренс 5мкм",
    "isFromSuitcase": false
  },
  {
    "id": "pt_183",
    "patientName": "Тумарбек Еркежан",
    "flatK": 43.2,
    "steepK": 43.95,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 43,0 OKV 10,2 43,50",
    "finalLens": "Заказ линз   OD  10,10 43,0 тор0 ех0,48 -2,50   OS 10,10 43,50 тор0 ех0,48 -2,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_184",
    "patientName": "Сапарбек Сабира",
    "flatK": 44.03,
    "steepK": 46.29,
    "deltaK": 2.26,
    "trialLens": "OKV 10,4 44,0 тор1,5 ех 0,5 -4,0 OKV 10,6 43,5 тор1,5 ех0,5 -4,0",
    "finalLens": "OKV 10,4 44,0 тор1,5 ех 0,5 -4,0 OKV 10,6 43,5 тор1,5 ех0,5 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_187",
    "patientName": "Сериккызы Лайлим",
    "flatK": 39.64,
    "steepK": 40.39,
    "deltaK": 0.75,
    "trialLens": "OKV10,6  39,5 тор 1,5 OKV 10,4 39,5 тор2,0",
    "finalLens": "Заказ линз   OD  ОД 10,60 39,50 тор 1,50 ех 0,58 -4,25 f+1,0 ДК 100   OS RGP",
    "isFromSuitcase": false
  },
  {
    "id": "pt_188",
    "patientName": "Ерофеева Яна",
    "flatK": 43.85,
    "steepK": 44.6,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 44,0 тор1,0 OKV 10,6 44,0 тор1,0",
    "finalLens": "Заказ линз  ОД 10,45 43,75 ех 0,46/0,43 тор 1,25 апик +3,0 -4,50 DK 100 ОС 10,45 44,00 ех 0,45/0,43 тор 1,25 -5,50 DK 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_189",
    "patientName": "Мулдашева Малика",
    "flatK": 42.4,
    "steepK": 43.15,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,5 тор 1,5 ех0,5 -4,0 OKV 11,0  42,0 ех0,5 тор 1,5 -4,0",
    "finalLens": "Заказ линз   OD  11,0 42,40 тор 1,80 ех 0,5/0,55 фактор 1,75 -6,0 OS 11,0 42,0 ех0,5/0,56 тор 1,90 фактор 2,0 -6,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_190",
    "patientName": "Ахматова Эмилия",
    "flatK": 42.41,
    "steepK": 43.16,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 42,5 OKV 10,6 42,0",
    "finalLens": "Заказ линз   OD 10,60 42,50 ex 0,50 -2,50 DK 100 blue OS 10,60 42,00 ex 0,50 -2,25 DK 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_192",
    "patientName": "Канат Айару",
    "flatK": 42.78,
    "steepK": 43.53,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,50 -4,5 тор0 ех0,5 OKV 10,8 42,50 -5,5 тор0 ех0,5",
    "finalLens": "Заказ линз OD 10,70 42,50 ex0,50 -5,0 faktor+1,50 DK 100 blue OS 10,70 42,50 ex0,50 -6,5 faktor+1,50 DK 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_193",
    "patientName": "Дифу Сания",
    "flatK": 43.88,
    "steepK": 44.63,
    "deltaK": 0.75,
    "trialLens": "OKV  10,2 44,0 тор1,5 OKV 10,2 44,0 тор1,0",
    "finalLens": "Заказ линз   OD  10,0 43,85 тор1,70 ех0,48 -4,5  OS 10,0 44,0 тор1,25 ех0,52/0,46 -4,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_194",
    "patientName": "Бастаубаева Алиша",
    "flatK": 42.34,
    "steepK": 43.09,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,5 тор1,0 OKV 10,6 42,5 тор1,0",
    "finalLens": "Заказ линз   OD 10,8 42,50 тор1,0 ех0,47 -2,0   OS 10,8 42,50 тор1,0 ех 0,50 -2,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_198",
    "patientName": "Келдыбай Аяла",
    "flatK": 44.2,
    "steepK": 44.95,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 44,0 тор1,0 OKV 10,4 43,50 тор1,0",
    "finalLens": "Заказ линз   OD  10,40 44,0 тор0,75 ех0,53 -4,50  OS 10,40 43,50 тор1,0 ех0,53 -3,75",
    "isFromSuitcase": false
  },
  {
    "id": "pt_200",
    "patientName": "Николсон Ева",
    "flatK": 42.44,
    "steepK": 43.32,
    "deltaK": 0.88,
    "trialLens": "OKV 10,8 42,5 -5,0 OKV 10,8 42,5 -5,0",
    "finalLens": "выданы с чемодана 10,8 42,5 -5,0 на оба глаза",
    "isFromSuitcase": true
  },
  {
    "id": "pt_201",
    "patientName": "Рысбек Дияр",
    "flatK": 43.89,
    "steepK": 44.64,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 43,5 тор1,0 ех0,50 OKV 10,40 44,00 тор1,0 ех0,50",
    "finalLens": "Заказ линз  OD 10,40 44,00 tor0,75 ex 0,54 -4,75 фак +1,5 ДК 100 b  OS 10,40 43,75 tor1,25 ex0,52/0,50 -4,75 фак+1,5 ДК 100 v",
    "isFromSuitcase": false
  },
  {
    "id": "pt_202",
    "patientName": "Алимхан Ерсултан",
    "flatK": 42.29,
    "steepK": 44.66,
    "deltaK": 2.37,
    "trialLens": "OKV  11,0 42,50 тор 1,5 ех 0,50 OKV 10,8 42,5 тор 1,5 ех 0,50",
    "finalLens": "OKV  11,0 42,50 тор 1,5 ех 0,50 OKV 10,8 42,5 тор 1,5 ех 0,50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_203",
    "patientName": "Канатжан Жанторе",
    "flatK": 41.99,
    "steepK": 42.74,
    "deltaK": 0.75,
    "trialLens": "OKV 10,6 41,5 тор1,0 OKV 10,8 41,5",
    "finalLens": "Заказ линз  ОД 10,60 42,00 тор1,0 ех 0,60 -6,25 фактор 1,75 ДК 100 blue ОС 10,60 42,00 ех 0,60 -6,50 фактор 1,75 ДК 100 violet",
    "isFromSuitcase": false
  },
  {
    "id": "pt_205",
    "patientName": "Абуева Жасмин",
    "flatK": 43.47,
    "steepK": 44.22,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 43,5 OKV 10,8 44,0",
    "finalLens": "Заказ линз   OD   10,8 44,0 -4,5 OS 10,8 44,5 -4,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_207",
    "patientName": "Абдыгали Муса-Али",
    "flatK": 44.94,
    "steepK": 46.11,
    "deltaK": 1.17,
    "trialLens": "OKV 10,2 45,0 тор1,0 OKV 10,2 44,5 тор1,0",
    "finalLens": "OKV 10,2 45,0 тор1,0 OKV 10,2 44,5 тор1,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_210",
    "patientName": "Жолболсын Гульдана",
    "flatK": 42.25,
    "steepK": 43.0,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 42,0 тор 1,0 ех 0,5 -4,0 OKV 10,8 42,5 тор 1,0 ех 0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,8 42,25 тор1,0 ех 0,5 -3,25    OS 10,8 42,5 тор 1,25 ех 0,53/0,54 факторкомпр. 1,0 -4,0",
    "isFromSuitcase": false
  },
  {
    "id": "pt_211",
    "patientName": "Токумбаев Жоламан",
    "flatK": 41.95,
    "steepK": 42.7,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 42,0 -3,5 OKV 10,8 42,5 -3,5",
    "finalLens": "Заказ линз   OD 10,7 42,0 -3,5    OS 10,7 42,5 -3,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_216",
    "patientName": "Тыништикбай Акерке",
    "flatK": 44.48,
    "steepK": 45.62,
    "deltaK": 1.14,
    "trialLens": "OKV 10,2  44,50  тор0  ех 0,5 OKV 10,2   44,00   тор0 ех 0,5",
    "finalLens": "Заказ линз   OD 10,4 44,5 тор0  ех 0,5 -5,5   OS 10,4 44,0 тор0  ех 0,5  -4,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_218",
    "patientName": "Мадиев Альнур",
    "flatK": 42.59,
    "steepK": 43.1,
    "deltaK": 0.51,
    "trialLens": "OKV 10,4 43,0 ех0,5 тор1,0 -4,0 OKV 10,4 42,5 ех0,5 тор1,0 -4,0",
    "finalLens": "Заказ линз   OD  10,28 42,81 ех0,53 тор 0,75 -1,5    OS 10,28 42,50 ех 0,53/0,51 тор1,0 -1,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_219",
    "patientName": "Мирас Мадалиев",
    "flatK": 42.73,
    "steepK": 45.83,
    "deltaK": 3.1,
    "trialLens": "OKV 43,0 ех0,5 тор1,5 -4,0 11,0 OKV 42,5 ех0,5 тор1,5 -4,0 10,8",
    "finalLens": "OKV 43,0 ех0,5 тор1,5 -4,0 11,0 OKV 42,5 ех0,5 тор1,5 -4,0 10,8",
    "isFromSuitcase": false
  },
  {
    "id": "pt_221",
    "patientName": "Белоусова Диана",
    "flatK": 43.88,
    "steepK": 44.63,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 44,0 OKV 10,8 44,00",
    "finalLens": "Заказ линз   OD из набора 10,8 44,0 -2,5 blue    OS из набора 10,8 44,0 -2,0 green",
    "isFromSuitcase": true
  },
  {
    "id": "pt_222",
    "patientName": "Канатжан Темирлан",
    "flatK": 41.3,
    "steepK": 42.05,
    "deltaK": 0.75,
    "trialLens": "OKV 10,8 41,0 OKV 10,8 41,5",
    "finalLens": "OKV 10,8 41,0 OKV 10,8 41,5",
    "isFromSuitcase": false
  },
  {
    "id": "pt_223",
    "patientName": "Толеген Амир",
    "flatK": 42.79,
    "steepK": 43.54,
    "deltaK": 0.75,
    "trialLens": "OKV 11,0 43,0 тор1,5 OKV 10,8 43,0 тор1,5",
    "finalLens": "Заказ линз   OD 10,8 43,0 тор1,5 ех 0,50 -3,25   OS 10,8 42,50 тор1,5 ех 0,50 -3,50",
    "isFromSuitcase": false
  },
  {
    "id": "pt_224",
    "patientName": "Шагирова Алмагуль",
    "flatK": 44.25,
    "steepK": 45.89,
    "deltaK": 1.64,
    "trialLens": "OKV  10,2 44,5 ех0,5 тор1,0 -4,0 OKV 10,2 44,0 ех0,5 тор0 -4,0",
    "finalLens": "Заказ линз   OD 10,10 44,5 ех0,5 тор1,0 -6,75 фак компр 2,0   OS 10,10 44,25 ех0,52 тор0,60 фак компр 1,0 клиренс 5 мкм",
    "isFromSuitcase": false
  },
  {
    "id": "pt_227",
    "patientName": "Сатпаева Шолпан",
    "flatK": 41.74,
    "steepK": 42.49,
    "deltaK": 0.75,
    "trialLens": "OKV 10,4 41,0 тор1,5 ех 0,5 -4,0 OKV 10,2 41,5 тор1,5 ех 0,5 -4,0",
    "finalLens": "Заказ линз   OD 10,2 41,75 тор1,5 ех 0,6/0,58 клиренс +3,0 -1,5   OS 10,2 41,75 тор1,5 ех 0,58 клиренс +3,0 -1,25",
    "isFromSuitcase": false
  },
  {
    "id": "pt_231",
    "patientName": "Русланов Руслан",
    "flatK": 43.33,
    "steepK": 44.08,
    "deltaK": 0.75,
    "trialLens": "OKV 10,2 43,0 ех0,5 OKV 10,2 43,0 ех0,5",
    "finalLens": "Заказ линз   OD 10,20 43,00 ex 0,50 -3,75 DK 100 blue OS 10,20 43,25 ex 0,50 -4,0 DK 100 violet",
    "isFromSuitcase": false
  }
];

export interface EmpiricalMatch {
    matchedPatient: PatientFittingRecord;
    similarityScore: number;
    recommendedTrialLens: string;
    recommendedFinalLens: string;
    recommendedAdjustment: string;
    isFromSuitcase: boolean;
}

export function findEmpiricalMatchingFit(flatK: number, steepK: number, deltaK: number): EmpiricalMatch | null {
    if (!flatK || !steepK) return null;
    
    let bestRecord: PatientFittingRecord | null = null;
    let minDistance = Infinity;
    
    for (const record of NEW_EYE_PATIENT_DATASET) {
        const k1Diff = Math.abs(record.flatK - flatK);
        const k2Diff = Math.abs(record.steepK - steepK);
        const dKDiff = Math.abs(record.deltaK - deltaK);
        
        const distance = k1Diff * 1.5 + k2Diff * 1.2 + dKDiff * 2.0;
        if (distance < minDistance) {
            minDistance = distance;
            bestRecord = record;
        }
    }
    
    if (!bestRecord) return null;
    
    const similarity = Math.max(75, Math.round(100 - minDistance * 10));
    
    let statusText = '';
    if (bestRecord.isFromSuitcase) {
        statusText = 'Линза была выдана пациенту из чемодана (набора клиники)!';
    } else {
        statusText = 'Линза была оформлена под индивидуальный заказ клиники.';
    }
    
    return {
        matchedPatient: bestRecord,
        similarityScore: similarity,
        recommendedTrialLens: bestRecord.trialLens,
        recommendedFinalLens: bestRecord.finalLens,
        recommendedAdjustment: statusText,
        isFromSuitcase: bestRecord.isFromSuitcase,
    };
}
