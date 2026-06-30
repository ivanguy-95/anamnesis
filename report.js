/* ---------------------------------------------------------------------------
   report.js
   ---------
   Сборка финального отчёта из state.profile в трёх форматах:
     • generateHtmlReport()  — HTML-страница, открывается в новой вкладке
                                и оттуда печатается в PDF (Cmd+P → Save as PDF).
     • downloadJson()        — JSON-файл с полным профилем (для AI/архива).
     • downloadAttachedPdfs() — отдельная выгрузка прикреплённых PDF
                                 (УТП из Блока 2, генетический тест из 7.3).

   Чтобы отчёт был читаемым по-русски, в LABELS и VALUE_MAPS хранится
   словарь «ключ → метка». Для неизвестных ключей показывается сам key —
   так ничего не теряется, даже если карта чего-то не покрывает.
   --------------------------------------------------------------------------- */

import { getProfile, exportJson } from './state.js';

// ---- Заголовки блоков ----------------------------------------------------
const BLOCK_TITLES = {
  identity:  '1. Паспорт спортсмена',
  event:     '2. Ключевые соревнования и периодизация',
  medical:   '3. Сведения о здоровье',
  endocrine: '4. Эндокринно-репродуктивный статус',
  nutrition: '5. Нутритивный анамнез',
  sleep:     '6. Сон, восстановление, психоэмоциональный статус',
  family:    '7. Семейный и генетический анамнез',
  logistics: '8. Контекст подготовки и логистика'
};

// ---- Метки полей --------------------------------------------------------
const LABELS = {
  // Identity
  fullName: 'ФИО', birthDate: 'Дата рождения', sex: 'Биологический пол',
  citizenship: 'Гражданство', trainingCountry: 'Страна тренировок',
  heightCm: 'Рост, см', weightKg: 'Масса сегодня, кг', bmi: 'ИМТ',
  weightAvgKg: 'Средняя масса за 6–12 мес, кг',
  weightMinKg: 'Минимум массы за 6–12 мес, кг',
  weightMaxKg: 'Максимум массы за 6–12 мес, кг',
  targetWeightNeeded: 'Нужна целевая соревновательная масса',
  targetWeightKg: 'Целевая масса, кг',
  bodyFatPct: '% жира', leanMassPct: '% сухой массы',
  bodyCompMethod: 'Метод измерения состава тела',
  bodyCompDate: 'Дата измерения состава тела',
  sports: 'Виды спорта',
  yearsTraining: 'Общий тренировочный стаж, лет',
  wadaPassport: 'Биологический паспорт WADA',
  wadaFederation: 'Федерация',
  hasTue: 'Исторические TUE', tueHistory: 'Детали TUE',

  // Event
  raceName: 'Название соревнования', raceDate: 'Дата старта',
  raceFormat: 'Формат', raceStartTime: 'Время старта',
  raceSchedule: 'Расписание стартов',
  raceLocation: 'Город соревнований',
  raceTemperature: 'Температура', raceAirHumidity: 'Воздух',
  raceSurface: 'Особенности местности',
  trainingLocationSame: 'Место тренировок совпадает с соревнованиями',
  trainingLocation: 'Город тренировок',
  trainingTemperature: 'Температура (тренировки)',
  trainingAirHumidity: 'Воздух (тренировки)',
  trainingSurface: 'Особенности местности (тренировки)',
  currentPhase: 'Этап подготовки', weeksToStart: 'Недель до старта',
  keyTrainingBlocks: 'Ключевые блоки УТП',
  keyBlocksPdf: 'PDF с УТП',
  lastPeakDate: 'Дата последнего пика нагрузок',
  taperDate: 'Дата начала тейпера',
  hasPriorSchemes: 'Был опыт фарм/нутр. поддержки под старты',
  priorSchemesDesc: 'Какие схемы применялись',
  whatWorked: 'Что работало', whatDidntWork: 'Что не работало / побочка',
  bestWorstResults: 'Лучший / худший результат',
  hadFormCrashes: 'Срывы формы', formCrashesReason: 'Срывы формы — детали',
  hadPreRaceIllness: 'Болезни перед стартом', preRaceIllnessReason: 'Болезни — детали',
  hadUnderRecovery: 'Недовосстановление', underRecoveryReason: 'Недовосстановление — детали',

  // Medical 3.1
  cvHypertension: 'Гипертензия', cvArrhythmia: 'Аритмии',
  cvProlapse: 'Пролапсы клапанов', cvMyocardiodystrophy: 'Миокардиодистрофия',
  cvMyocarditis: 'Перенесённые миокардиты',
  endoAit: 'АИТ', endoHypothyroidism: 'Гипотиреоз',
  endoHyperthyroidism: 'Гипертиреоз', endoDiabetes: 'Сахарный диабет',
  endoMetabolicSyndrome: 'Метаболический синдром', endoPcos: 'СПКЯ',
  giGastritis: 'Гастрит / язвенная болезнь', giGerd: 'ГЭРБ', giIbs: 'СРК',
  giCholecystPancreatitis: 'Холецистит / панкреатит',
  giLiver: 'Заболевания печени', giIbd: 'ВЗК', giEatingDisorder: 'РПП',
  renalCkd: 'ХБП', renalStones: 'МКБ', renalUti: 'Частые ИМП',
  respAsthma: 'Бронхиальная астма', respEib: 'EIB', respCopd: 'ХОБЛ',
  respSinusitis: 'Частые синуситы',
  cnsEpilepsy: 'Эпилепсия', cnsMigraine: 'Мигрени',
  cnsTbi: 'Последствия ЧМТ', cnsAnxiety: 'Тревожные/депрессивные расстройства',
  bloodAnemia: 'Анемия в анамнезе',
  bloodHbv: 'HBV', bloodHcv: 'HCV', bloodHsv: 'HSV',
  bloodEbv: 'EBV', bloodCmv: 'CMV', bloodHiv: 'HIV',
  bloodFrequentInfections: 'Частые ОРВИ / инфекции',
  muscHernias: 'Грыжи позвоночника', muscProtrusions: 'Протрузии',
  muscArthrosis: 'Артрозы', muscCongenital: 'Врождённые особенности',

  // Medical 3.2-3.5
  hadSurgeries: 'Хирургические вмешательства',
  hadInfections: 'Тяжёлые инфекции за 2 года',
  hadTransfusions: 'Гемотрансфузии', hadStressFractures: 'Стресс-переломы',
  hasActiveInjuries: 'Активные травмы',
  hasChronicPain: 'Хронические боли',
  usesNsaids: 'Регулярный приём НПВС',
  rehabStatus: 'Реабилитационный статус',
  hasDrugAllergy: 'Лекарственная аллергия',
  hasFoodIntolerance: 'Пищевая непереносимость',
  hasNutrientIntolerance: 'Непереносимость нутриентов',
  hasPhysicalAllergy: 'Физические аллергии',
  hasInjectionReaction: 'Реакции на инъекции',
  hasCurrentMeds: 'Постоянный приём лекарств',
  hasSupplements: 'БАДы, спортпит',
  hasContraceptives: 'Гормональные контрацептивы',
  hasTueMeds: 'Препараты по TUE',
  hasRecentlyStopped: 'Препараты, отменённые за 30 дней',

  // Endocrine
  menarcheAge: 'Возраст менархе, лет',
  cycleLength: 'Средняя длина цикла, дней',
  cyclesPerYear: 'Циклов в год',
  hasOligomenorrhea: 'Олигоменорея', hasAmenorrhea: 'Аменорея',
  hasPrimaryAmenorrhea: 'Первичная аменорея',
  hasPms: 'ПМС', hasDysmenorrhea: 'Дисменорея',
  hasCurrentPregnancy: 'Текущая беременность',
  hasPlannedPregnancy: 'Планируемая беременность',
  hadDelivery: 'Роды в анамнезе', hasLactation: 'Лактация',
  hasLibidoDecline: 'Снижение либидо',
  hasErectileDecline: 'Снижение эректильной функции',
  hasMorningErectionsDecline: 'Снижение утренних эрекций',
  hasMoodChanges: 'Изменения настроения',
  hasMotivationChanges: 'Снижение мотивации',
  hasAggressionChanges: 'Изменения агрессивности',
  hasGynecomastia: 'Гинекомастия',
  hasHairChanges: 'Изменения волосяного покрова',
  hasDexa: 'DEXA-исследование',
  hasBoneMarkers: 'Маркеры костного обмена',
  hasFamilyOsteoporosis: 'Остеопороз у родственников 1-й линии',
  hasLowBodyWeightHistory: 'Низкая масса тела в подростковом возрасте',
  hasGeneralSymptoms: 'Общие симптомы',
  hasHypothyroidSymptoms: 'Признаки гипотиреоза',
  hasMetabolicSymptoms: 'Признаки нарушений углеводного обмена',
  hasKnownSubclinical: 'Известные субклинические состояния',
  preRaceAnxiety: 'Тревожность перед стартами (1–10)',

  // Nutrition
  dietType: 'Тип питания', dietTypeOther: 'Тип питания (уточнение)',
  hasDietRestrictions: 'Религиозные или культурные ограничения, посты',
  dietRestrictions: 'Религиозные / культурные ограничения', // legacy
  mealsPerDay: 'Число приёмов пищи в день',
  dailyCaloriesEstimate: 'Самооценка калорийности, ккал/сут',
  hasBreakfast: 'Завтракает каждый день',
  breakfastFrequency: 'Периодичность завтраков',
  hasMacroTargets: 'Целевые БЖУ от диетолога',
  hydrationNormalLiters: 'Жидкости в день, л',
  hydrationHardLiters: 'Жидкости в дни тренировок, л',
  sweatLevel: 'Уровень потоотделения',
  usesElectrolytes: 'Изотоники / электролиты',
  hasWeightLossTracking: 'Измеряет потерю массы за тренировку',
  hasCalorieRestriction: 'Сознательное ограничение калорий',
  hasDryingPeriods: 'Сезонные сушки',
  hasWeightSwings: 'Скачки массы между сезонами',
  hasFuelLowFeelings: 'Ощущение нехватки энергии',
  hasDizziness: 'Головокружения',
  hasScreeningQuestionnaires: 'LEAF-Q / LEAM-Q',
  supplementSource: 'Источник БАДов',
  hasBatchCerts: 'Batch-сертификаты',

  // Sleep
  sleepDurationNormal: 'Длительность сна до тренировки, ч',
  sleepDurationBeforeHard: 'Длительность сна после тренировки, ч',
  bedtime: 'Время отхода ко сну', wakeupTime: 'Время пробуждения',
  sleepQuality: 'Качество сна (1–10)',
  hasInsomnia: 'Эпизоды бессонницы',
  usesMelatonin: 'Принимает мелатонин',
  hasSleepApnea: 'Жалобы на ночное апноэ',
  hadDepression: 'Эпизоды депрессии', hadBurnout: 'Эпизоды выгорания',
  worksWithPsychologist: 'Работает с психологом',
  takesAntidepressants: 'Принимает антидепрессанты / анксиолитики',
  tracksHrv: 'Измеряет HRV',
  tracksMorningPulse: 'Отслеживает утренний пульс',
  tracksRecoveryScale: 'Шкала восстановления (Hooper/Borg/RPE)',
  hasMotivationLoss: 'Упало желание тренироваться',
  hasPerformanceDecline: 'Снижение работоспособности (4–8 нед)',
  hasFrequentInfections: 'Частые ОРВИ (≥3 за 6 мес)',
  smokes: 'Курит',
  drinksAlcohol: 'Употребляет алкоголь',
  hadBingeDrinking: 'Запойные эпизоды',
  usesCaffeine: 'Потребляет кофеин',
  usesRecreationalSubstances: 'Рекреационные вещества',

  // Family
  familyCvd: 'ССЗ у родственников 1-й линии',
  familySuddenDeath: 'Внезапная сердечная смерть в семье',
  familyStroke: 'Инсульты в семье',
  familyDiabetes: 'Сахарный диабет в семье',
  familyCancer: 'Онкология в семье',
  familyThrombophilia: 'Тромбофилии в семье',
  familyHemochromatosis: 'Гемохроматоз в семье',
  familyHyperhomocysteinemia: 'Гомоцистеинемия в семье',
  hasGeneticTest: 'Генетический тест',
  geneticTestPdf: 'PDF генетического теста',

  // Logistics
  homeCity: 'Город постоянного проживания',
  homeAltitude: 'Высота над уровнем моря, м',
  hasFlightsToStart: 'Перелёты до старта',
  hasMountainCamps: 'Сборы в среднегорье / высокогорье',
  hasAccessIssues: 'Сложности с лабораториями / аптеками',
  hasBudgetLimits: 'Ограничения по бюджету / импорту'
};

// ---- Перевод значений (enum'ы) ------------------------------------------
const VALUE_MAPS = {
  level: { elite: 'Элита', pro: 'Профессионал', amateur: 'Любитель' },
  sex: { m: 'Мужской', f: 'Женский' },
  bodyCompMethod: { DEXA: 'DEXA', BIA: 'BIA (биоимпеданс)', caliper: 'Калипер', other: 'Другое' },
  raceFormat: { single_day: 'Один день', multi_day: 'Многодневка', tour: 'Тур', series: 'Серия стартов' },
  currentPhase: {
    base: 'Базовый', special: 'Специально-подготовительный',
    precomp: 'Предсоревновательный', comp: 'Соревновательный',
    transit: 'Переходный', recovery: 'Восстановительный'
  },
  raceTemperature: { hot: 'Жара (>25°C)', normal: 'Норма (10–20°C)', cold: 'Холодно (<10°C)' },
  raceAirHumidity: { humid: 'Влажный', dry: 'Сухой', normal: 'Обычный' },
  trainingTemperature: { hot: 'Жара (>25°C)', normal: 'Норма (10–20°C)', cold: 'Холодно (<10°C)' },
  trainingAirHumidity: { humid: 'Влажный', dry: 'Сухой', normal: 'Обычный' },
  dietType: {
    omnivorous: 'Всеядность', vegetarian: 'Вегетарианство', vegan: 'Веганство',
    keto: 'Кето', intermittentFasting: 'Интервальное голодание',
    lowCarb: 'Низкоуглеводная', other: 'Другое'
  },
  sweatLevel: { light: 'Слабое', moderate: 'Умеренное', heavy: 'Сильное' },
  supplementSource: {
    pharmacyRu: 'Только в аптеке РФ', foreignViaResellers: 'Зарубежные через посредников',
    personalImport: 'Лично из-за границы', mixed: 'Комбинация / другое'
  }
};

const RANK_MAP = {
  yth3: '3-й юношеский', yth2: '2-й юношеский', yth1: '1-й юношеский',
  adlt3: '3-й спортивный', adlt2: '2-й спортивный', adlt1: '1-й спортивный',
  KMS: 'КМС', MS: 'МС', MSMK: 'МСМК'
};

// ---- Публичный API ------------------------------------------------------

export function openReport() {
  const html = generateHtmlReport();
  const w = window.open('', '_blank');
  if (!w) {
    alert('Браузер заблокировал открытие отчёта. Разрешите всплывающие окна');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function downloadJson() {
  const blob = new Blob([exportJson()], { type: 'application/json' });
  triggerDownload(URL.createObjectURL(blob), filename('json'));
}

// Список прикреплённых PDF (для рендера кнопок и скачивания)
export function listAttachedPdfs() {
  const profile = getProfile();
  const out = [];
  const ev = profile.blocks.event && profile.blocks.event.answers;
  if (ev && ev.keyBlocksPdf && ev.keyBlocksPdf.dataUrl) {
    out.push({ label: 'УТП (Блок 2)', pdf: ev.keyBlocksPdf });
  }
  const fm = profile.blocks.family && profile.blocks.family.answers;
  if (fm && fm.geneticTestPdf && fm.geneticTestPdf.dataUrl) {
    out.push({ label: 'Генетический тест (Блок 7.3)', pdf: fm.geneticTestPdf });
  }
  return out;
}

export function downloadAttachedPdf(pdf) {
  triggerDownload(pdf.dataUrl, pdf.name);
}

// Отправить анамнез врачу через serverless-функцию /api/send.
// Возвращает Promise<boolean> — true если успех, false если ошибка.
// Подробности ошибки выводятся в console.
export async function sendToDoctor() {
  const profile = getProfile();
  const profileJson = exportJson();
  const htmlReport  = generateHtmlReport();
  const attachments = listAttachedPdfs().map(a => ({
    name: a.pdf.name,
    dataUrl: a.pdf.dataUrl
  }));

  try {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileJson, htmlReport, attachments })
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('send failed:', res.status, text);
      return false;
    }
    return true;
  } catch (e) {
    console.error('send network error:', e);
    return false;
  }
}

// ---- Сборка HTML --------------------------------------------------------

export function generateHtmlReport() {
  const profile = getProfile();
  const dateStr = new Date().toLocaleDateString('ru-RU');

  let body = `
    <section>
      <h2>Сводка</h2>
      <table>
        <tr><td>Уровень</td><td>${esc(formatValue('level', profile.meta.level))}</td></tr>
        ${profile.meta.goal ? `<tr><td>Цель</td><td>${esc(profile.meta.goal)}</td></tr>` : ''}
        <tr><td>Дата заполнения</td><td>${esc(dateStr)}</td></tr>
      </table>
    </section>
  `;

  for (const blockKey of Object.keys(BLOCK_TITLES)) {
    body += renderBlockSection(blockKey, profile.blocks[blockKey]);
  }

  return wrapHtml(body, dateStr);
}

function renderBlockSection(blockKey, block) {
  if (!block || !block.answers) return '';

  // Берём только непустые ответы.
  const entries = Object.entries(block.answers).filter(([_, v]) => !isEmpty(v));
  if (entries.length === 0) return '';

  const answers = block.answers;
  const seen = new Set();
  const rows = [];

  for (const [key, value] of entries) {
    if (seen.has(key)) continue;

    // Detail/Reason-поля рендерятся вместе с родителем — пропускаем
    // на верхнем уровне, родитель сам их подцепит.
    if (key.endsWith('Detail') || key.endsWith('Reason')) {
      const parent = key.replace(/Detail$|Reason$/, '');
      if (answers[parent] !== undefined && !isEmpty(answers[parent])) continue;
    }

    seen.add(key);
    const label = LABELS[key] || key;
    const formatted = formatValue(key, value);

    rows.push(`<tr><td>${esc(label)}</td><td>${formatted}</td></tr>`);

    // Подцепляем детали под родительский гейт.
    const detailKey = key + 'Detail';
    const reasonKey = key + 'Reason';
    if (!isEmpty(answers[detailKey])) {
      seen.add(detailKey);
      rows.push(`<tr><td class="detail-label">└ Детали</td><td>${esc(answers[detailKey])}</td></tr>`);
    } else if (!isEmpty(answers[reasonKey])) {
      seen.add(reasonKey);
      rows.push(`<tr><td class="detail-label">└ Детали</td><td>${esc(answers[reasonKey])}</td></tr>`);
    }
  }

  if (rows.length === 0) return '';
  return `
    <section>
      <h2>${esc(BLOCK_TITLES[blockKey])}</h2>
      <table>${rows.join('')}</table>
    </section>
  `;
}

function formatValue(key, value) {
  if (value === 'yes') return 'Да';
  if (value === 'no')  return 'Нет';
  if (value === 'not_checked') return 'не проверялся';

  if (key === 'sports' && Array.isArray(value)) return formatSports(value);

  // Прикреплённый файл — показываем как ссылку «📎 название».
  if (value && typeof value === 'object' && value.name && value.dataUrl) {
    return `<span class="file-link">📎 ${esc(value.name)}</span>`;
  }

  if (VALUE_MAPS[key] && VALUE_MAPS[key][value]) return esc(VALUE_MAPS[key][value]);

  return esc(value);
}

function formatSports(sports) {
  if (!sports.length) return '—';
  return sports.map(s => {
    const parts = [];
    if (s.name)  parts.push(`<b>${esc(s.name)}</b>`);
    if (s.years != null && s.years !== '') parts.push(`стаж ${esc(s.years)} лет`);
    if (s.role)  parts.push(`амплуа: ${esc(s.role)}`);
    if (s.rank)  parts.push(`разряд: ${esc(RANK_MAP[s.rank] || s.rank)}`);
    return parts.join(' · ');
  }).join('<br>');
}

function isEmpty(v) {
  if (v === null || v === undefined || v === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    // прикреплённый PDF — это объект; считаем непустым, если есть имя
    if (v.name) return false;
    return Object.keys(v).length === 0;
  }
  return false;
}

function wrapHtml(body, dateStr) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Анамнез спортсмена — ${esc(dateStr)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
           max-width: 820px; margin: 28px auto; padding: 0 22px;
           color: #0F172A; line-height: 1.5; }
    h1 { font-size: 26px; margin: 0 0 4px; }
    .meta { color: #64748B; font-size: 13px; margin-bottom: 24px; }
    h2 { font-size: 17px; margin: 28px 0 10px; padding-bottom: 6px;
         border-bottom: 1px solid #E2E8F0; color: #0F766E; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 8px; vertical-align: top;
         border-bottom: 1px solid #F1F5F9; font-size: 14px; }
    td:first-child { width: 40%; color: #475569; }
    .detail-label { color: #94A3B8; padding-left: 16px; font-style: italic; }
    .file-link { color: #0F766E; font-weight: 500; }
    b { font-weight: 600; }
    @media print {
      body { margin: 0; padding: 16px 22px; }
      h2 { break-inside: avoid; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Анамнез спортсмена</h1>
  <p class="meta">Документ сгенерирован ${esc(dateStr)}</p>
  ${body}
</body>
</html>`;
}

// ---- Утилиты -----------------------------------------------------------

function triggerDownload(href, name) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function filename(ext) {
  const date = new Date().toISOString().slice(0, 10);
  return `anamnesis-${date}.${ext}`;
}

function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
