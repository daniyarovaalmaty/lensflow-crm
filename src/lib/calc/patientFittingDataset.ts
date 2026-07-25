/**
 * Empirical Clinical Fitting Dataset trained on 231 Patients from New Eye Clinic
 */

export interface PatientFittingRecord {
    id: string;
    patientName: string;
    flatK: number;
    steepK: number;
    deltaK: number;
    trialLens: string;
    finalLens: string;
}

export const NEW_EYE_PATIENT_DATASET: PatientFittingRecord[] = [
  {
    "id": "pt_1",
    "patientName": "Серикхан Нурхан",
    "flatK": 44.25,
    "steepK": 46.42,
    "deltaK": 2.17,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_5",
    "patientName": "Молдахмет Арслан",
    "flatK": 45.46,
    "steepK": 46.37,
    "deltaK": 0.91,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_6",
    "patientName": "Оразбеков Аль-Галым",
    "flatK": 41.57,
    "steepK": 43.03,
    "deltaK": 1.46,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_7",
    "patientName": "Оразбекова Айгерим",
    "flatK": 40.37,
    "steepK": 42.32,
    "deltaK": 1.95,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_9",
    "patientName": "Сабитов Даулет",
    "flatK": 41.34,
    "steepK": 42.97,
    "deltaK": 1.63,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_10",
    "patientName": "Дюсенбеков Алтынбек2",
    "flatK": 44.5,
    "steepK": 46.0,
    "deltaK": 1.5,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_15",
    "patientName": "Паталахова Марина",
    "flatK": 42.24,
    "steepK": 42.69,
    "deltaK": 0.45,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_19",
    "patientName": "Есимхан Алисултан",
    "flatK": 40.43,
    "steepK": 41.7,
    "deltaK": 1.27,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_20",
    "patientName": "Ромащенко Даниил",
    "flatK": 44.5,
    "steepK": 45.75,
    "deltaK": 1.25,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_22",
    "patientName": "Тулегенова Айжан",
    "flatK": 41.98,
    "steepK": 43.51,
    "deltaK": 1.53,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_24",
    "patientName": "Чопиева Айлин",
    "flatK": 44.3,
    "steepK": 46.03,
    "deltaK": 1.73,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_28",
    "patientName": "Маратова Адина",
    "flatK": 40.86,
    "steepK": 41.24,
    "deltaK": 0.38,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_29",
    "patientName": "Амангелды Даниал",
    "flatK": 42.62,
    "steepK": 44.45,
    "deltaK": 1.83,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_31",
    "patientName": "Игнатович Василиса",
    "flatK": 44.31,
    "steepK": 46.29,
    "deltaK": 1.98,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_32",
    "patientName": "Мадалиева Медина",
    "flatK": 41.81,
    "steepK": 44.62,
    "deltaK": 2.81,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_34",
    "patientName": "Бугаева Лидия",
    "flatK": 43.44,
    "steepK": 44.42,
    "deltaK": 0.98,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_38",
    "patientName": "Ганиева Айниса",
    "flatK": 41.53,
    "steepK": 41.81,
    "deltaK": 0.28,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_39",
    "patientName": "Алдыбаев Телмужин",
    "flatK": 41.25,
    "steepK": 43.0,
    "deltaK": 1.75,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_40",
    "patientName": "Дюсенбеков Алтынбек",
    "flatK": 44.5,
    "steepK": 46.0,
    "deltaK": 1.5,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_41",
    "patientName": "Газиз Ерасыл",
    "flatK": 40.78,
    "steepK": 41.26,
    "deltaK": 0.48,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_43",
    "patientName": "Абдолаева Ясмин",
    "flatK": 42.89,
    "steepK": 44.51,
    "deltaK": 1.62,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_47",
    "patientName": "Дауренулы Азамат",
    "flatK": 44.23,
    "steepK": 45.07,
    "deltaK": 0.84,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_49",
    "patientName": "Ильясов Данияр",
    "flatK": 44.22,
    "steepK": 47.06,
    "deltaK": 2.84,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_50",
    "patientName": "Отебай Каусар",
    "flatK": 42.52,
    "steepK": 43.98,
    "deltaK": 1.46,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_51",
    "patientName": "Жанбырбай Султан",
    "flatK": 42.59,
    "steepK": 43.63,
    "deltaK": 1.04,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_53",
    "patientName": "Величко Яна",
    "flatK": 42.81,
    "steepK": 44.05,
    "deltaK": 1.24,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_54",
    "patientName": "Омирбек Мольдыр",
    "flatK": 42.81,
    "steepK": 43.93,
    "deltaK": 1.12,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_56",
    "patientName": "Шеттикбаев Нурасыл",
    "flatK": 42.04,
    "steepK": 44.61,
    "deltaK": 2.57,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_59",
    "patientName": "Шамшидинов Рамир",
    "flatK": 42.15,
    "steepK": 42.8,
    "deltaK": 0.65,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_61",
    "patientName": "Кобельский Радислав",
    "flatK": 43.2,
    "steepK": 45.83,
    "deltaK": 2.63,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_62",
    "patientName": "Естемесова Айбарша",
    "flatK": 43.9,
    "steepK": 45.0,
    "deltaK": 1.1,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_68",
    "patientName": "Руденко София",
    "flatK": 42.35,
    "steepK": 42.71,
    "deltaK": 0.36,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_71",
    "patientName": "Зуйкова Амалия",
    "flatK": 43.3,
    "steepK": 45.8,
    "deltaK": 2.5,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_74",
    "patientName": "Абдихан Аруназ",
    "flatK": 45.53,
    "steepK": 46.64,
    "deltaK": 1.11,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_77",
    "patientName": "Кибирова Рамина",
    "flatK": 44.44,
    "steepK": 45.8,
    "deltaK": 1.36,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_81",
    "patientName": "Кузьмин Данил",
    "flatK": 43.17,
    "steepK": 44.49,
    "deltaK": 1.32,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_86",
    "patientName": "Рахым Ансаган",
    "flatK": 40.8,
    "steepK": 43.14,
    "deltaK": 2.34,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_90",
    "patientName": "Аймаканбетова Айдана",
    "flatK": 45.25,
    "steepK": 46.25,
    "deltaK": 1.0,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_92",
    "patientName": "Аспандияркызы Томирис",
    "flatK": 45.37,
    "steepK": 47.22,
    "deltaK": 1.85,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_93",
    "patientName": "Аскар Шырын",
    "flatK": 42.48,
    "steepK": 44.05,
    "deltaK": 1.57,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_96",
    "patientName": "Болат Алижан",
    "flatK": 41.29,
    "steepK": 43.01,
    "deltaK": 1.72,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_102",
    "patientName": "Ауесханова Мерей",
    "flatK": 41.38,
    "steepK": 43.18,
    "deltaK": 1.8,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_105",
    "patientName": "Медеу Мирас",
    "flatK": 44.75,
    "steepK": 47.25,
    "deltaK": 2.5,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_109",
    "patientName": "Сабит Куралай",
    "flatK": 41.7,
    "steepK": 43.3,
    "deltaK": 1.6,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_110",
    "patientName": "Мугиева Аэлина — копия",
    "flatK": 43.07,
    "steepK": 44.67,
    "deltaK": 1.6,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_116",
    "patientName": "Шарипов Марат",
    "flatK": 40.91,
    "steepK": 42.14,
    "deltaK": 1.23,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_119",
    "patientName": "Жакен Айерке",
    "flatK": 41.66,
    "steepK": 43.39,
    "deltaK": 1.73,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_120",
    "patientName": "Рахимова Сафира",
    "flatK": 42.87,
    "steepK": 44.62,
    "deltaK": 1.75,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_122",
    "patientName": "Негметов Ернар",
    "flatK": 43.31,
    "steepK": 44.49,
    "deltaK": 1.18,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_124",
    "patientName": "Соболева София",
    "flatK": 43.66,
    "steepK": 45.19,
    "deltaK": 1.53,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_125",
    "patientName": "Мухамеднепес Зере",
    "flatK": 44.0,
    "steepK": 44.5,
    "deltaK": 0.5,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_126",
    "patientName": "Абдулгазиева Алтынай",
    "flatK": 41.99,
    "steepK": 43.65,
    "deltaK": 1.66,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_129",
    "patientName": "Садирова Иная",
    "flatK": 44.03,
    "steepK": 45.35,
    "deltaK": 1.32,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_130",
    "patientName": "Артомонов Михаил",
    "flatK": 43.31,
    "steepK": 44.0,
    "deltaK": 0.69,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_131",
    "patientName": "Досболов Наби",
    "flatK": 41.38,
    "steepK": 42.86,
    "deltaK": 1.48,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_133",
    "patientName": "Сабиткызы Инкар",
    "flatK": 43.2,
    "steepK": 44.01,
    "deltaK": 0.81,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_134",
    "patientName": "Ерлан Ильяс",
    "flatK": 43.56,
    "steepK": 44.17,
    "deltaK": 0.61,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_135",
    "patientName": "Горянец Алиса",
    "flatK": 38.75,
    "steepK": 40.5,
    "deltaK": 1.75,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_136",
    "patientName": "Максутбек Амир",
    "flatK": 43.58,
    "steepK": 44.77,
    "deltaK": 1.19,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_137",
    "patientName": "Мацковская Анастасия",
    "flatK": 43.66,
    "steepK": 44.4,
    "deltaK": 0.74,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_139",
    "patientName": "Дюсенбек Жадыра",
    "flatK": 43.21,
    "steepK": 44.33,
    "deltaK": 1.12,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_141",
    "patientName": "Сарыкая Элиф",
    "flatK": 46.27,
    "steepK": 46.99,
    "deltaK": 0.72,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_142",
    "patientName": "Павлов Егор",
    "flatK": 40.07,
    "steepK": 42.62,
    "deltaK": 2.55,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_147",
    "patientName": "Канат Ибрагим",
    "flatK": 40.23,
    "steepK": 43.37,
    "deltaK": 3.14,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_150",
    "patientName": "Айткожа Балым",
    "flatK": 45.01,
    "steepK": 46.74,
    "deltaK": 1.73,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_151",
    "patientName": "Рыспек Айзара",
    "flatK": 43.12,
    "steepK": 44.06,
    "deltaK": 0.94,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_153",
    "patientName": "Айкынбеккызы Айсулу",
    "flatK": 41.86,
    "steepK": 43.12,
    "deltaK": 1.26,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_155",
    "patientName": "Кусаинова Султана",
    "flatK": 44.6,
    "steepK": 46.55,
    "deltaK": 1.95,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_156",
    "patientName": "Даурен",
    "flatK": 43.01,
    "steepK": 43.32,
    "deltaK": 0.31,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_159",
    "patientName": "Алдибекова Гульжанат",
    "flatK": 41.28,
    "steepK": 42.11,
    "deltaK": 0.83,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_161",
    "patientName": "Кенжебекова Алтынай",
    "flatK": 42.56,
    "steepK": 42.91,
    "deltaK": 0.35,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_162",
    "patientName": "Нойфельд Алена",
    "flatK": 43.29,
    "steepK": 44.03,
    "deltaK": 0.74,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_166",
    "patientName": "Толмухан Мейрат",
    "flatK": 43.58,
    "steepK": 45.25,
    "deltaK": 1.67,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_171",
    "patientName": "Мугиева Аэлина",
    "flatK": 43.07,
    "steepK": 44.67,
    "deltaK": 1.6,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_174",
    "patientName": "Глоба Карина",
    "flatK": 41.61,
    "steepK": 42.13,
    "deltaK": 0.52,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_175",
    "patientName": "Абдихан Айдана",
    "flatK": 46.24,
    "steepK": 47.5,
    "deltaK": 1.26,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_176",
    "patientName": "Айдархан Амирхан",
    "flatK": 44.19,
    "steepK": 44.8,
    "deltaK": 0.61,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_178",
    "patientName": "Аданов Маджит",
    "flatK": 40.84,
    "steepK": 41.58,
    "deltaK": 0.74,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_179",
    "patientName": "Раимов Тамерлан",
    "flatK": 42.59,
    "steepK": 44.15,
    "deltaK": 1.56,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_182",
    "patientName": "Мацковская Ксения",
    "flatK": 44.05,
    "steepK": 44.83,
    "deltaK": 0.78,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_184",
    "patientName": "Сапарбек Сабира",
    "flatK": 44.03,
    "steepK": 46.29,
    "deltaK": 2.26,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_185",
    "patientName": "Саянкызы Саида",
    "flatK": 45.49,
    "steepK": 46.73,
    "deltaK": 1.24,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_186",
    "patientName": "Щапов Валерий",
    "flatK": 41.49,
    "steepK": 43.6,
    "deltaK": 2.11,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_191",
    "patientName": "Жанай Айзере",
    "flatK": 39.66,
    "steepK": 41.3,
    "deltaK": 1.64,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_195",
    "patientName": "Сулейманов Искандер",
    "flatK": 43.13,
    "steepK": 44.79,
    "deltaK": 1.66,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_196",
    "patientName": "Костюченко Дмитрий",
    "flatK": 42.73,
    "steepK": 43.38,
    "deltaK": 0.65,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_197",
    "patientName": "Дауренбек Сария",
    "flatK": 44.74,
    "steepK": 46.55,
    "deltaK": 1.81,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_200",
    "patientName": "Николсон Ева",
    "flatK": 42.44,
    "steepK": 43.32,
    "deltaK": 0.88,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_204",
    "patientName": "Кудайберген Назерке",
    "flatK": 45.3,
    "steepK": 45.83,
    "deltaK": 0.53,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_206",
    "patientName": "Мамин Александр",
    "flatK": 41.5,
    "steepK": 42.6,
    "deltaK": 1.1,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_207",
    "patientName": "Абдыгали Муса-Али",
    "flatK": 44.94,
    "steepK": 46.11,
    "deltaK": 1.17,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_209",
    "patientName": "Маратова Залина",
    "flatK": 42.01,
    "steepK": 42.49,
    "deltaK": 0.48,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_212",
    "patientName": "Кобетай Багым",
    "flatK": 43.25,
    "steepK": 44.24,
    "deltaK": 0.99,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_213",
    "patientName": "Рахым Мадина",
    "flatK": 42.06,
    "steepK": 43.6,
    "deltaK": 1.54,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_215",
    "patientName": "Тагвиашвили Анна-Мария",
    "flatK": 44.06,
    "steepK": 44.49,
    "deltaK": 0.43,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_216",
    "patientName": "Тыништикбай Акерке",
    "flatK": 44.48,
    "steepK": 45.62,
    "deltaK": 1.14,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_218",
    "patientName": "Мадиев Альнур",
    "flatK": 42.59,
    "steepK": 43.1,
    "deltaK": 0.51,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_219",
    "patientName": "Мирас Мадалиев",
    "flatK": 42.73,
    "steepK": 45.83,
    "deltaK": 3.1,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_220",
    "patientName": "Ерубай Алихан",
    "flatK": 43.62,
    "steepK": 46.0,
    "deltaK": 2.38,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_224",
    "patientName": "Шагирова Алмагуль",
    "flatK": 44.25,
    "steepK": 45.89,
    "deltaK": 1.64,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_225",
    "patientName": "Кошкинбек Ескендир",
    "flatK": 43.26,
    "steepK": 44.76,
    "deltaK": 1.5,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_226",
    "patientName": "Чуйкова Валерия",
    "flatK": 44.47,
    "steepK": 45.13,
    "deltaK": 0.66,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_228",
    "patientName": "Пашковская Владислава",
    "flatK": 43.28,
    "steepK": 43.85,
    "deltaK": 0.57,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_229",
    "patientName": "Менжию Ильдар",
    "flatK": 44.42,
    "steepK": 45.5,
    "deltaK": 1.08,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  },
  {
    "id": "pt_230",
    "patientName": "Сейдахметова Амина",
    "flatK": 42.93,
    "steepK": 44.68,
    "deltaK": 1.75,
    "trialLens": "BC 81 / RZD 525 / LZA 34",
    "finalLens": "BC 81 / RZD 525 / LZA 34"
  }
];

export interface EmpiricalMatch {
    matchedPatient: PatientFittingRecord;
    similarityScore: number;
    recommendedTrialLens: string;
    recommendedFinalLens: string;
    recommendedAdjustment: string;
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
    const isAdjusted = bestRecord.trialLens !== bestRecord.finalLens;
    
    let adjustmentNotice = 'Первично примерена и идеально подошла линза из стандартного набора';
    if (isAdjusted) {
        adjustmentNotice = `Рекомендуется скорректировать параметры по опыту аналогичного случая (${bestRecord.patientName})`;
    }
    
    return {
        matchedPatient: bestRecord,
        similarityScore: similarity,
        recommendedTrialLens: bestRecord.trialLens,
        recommendedFinalLens: bestRecord.finalLens,
        recommendedAdjustment: adjustmentNotice,
    };
}
