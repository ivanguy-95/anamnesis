/* ---------------------------------------------------------------------------
   blocks/medical.js
   -----------------
   БЛОК 3. «Сведения о здоровье».
   Пять секций по PDF-опроснику:
     3.1 Хронические заболевания (8 систем)
     3.2 Операции, госпитализации, тяжёлые инфекции
     3.3 Травмы и их последствия
     3.4 Аллергии и непереносимости
     3.5 Текущая терапия

   Адаптивность:
     • Каждый медицинский раздел — гейт «Есть / Нет» → textarea с деталями.
       Это бережёт форму: если у клиента ничего нет, остаётся пара кликов.
     • Cross-block: sex (Блок 1)  → раскрывает «Гормональные контрацептивы».
     • Cross-block: hasTue (Блок 1) → раскрывает «Препараты по TUE».

   Все detail-поля автосохраняются. Гейты сохраняются через собственные
   обработчики в bindGated.
   --------------------------------------------------------------------------- */

import { getProfile, setAnswer } from '../state.js';
import { validateRequired } from '../validate.js';

const BLOCK_ID = 'medical';

// Каталог хронических заболеваний для 3.1.
// Каждая система → массив конкретных диагнозов. Аббревиатуры даём в label,
// а расшифровку — в abbrFull (отображается мелким серым рядом).
// Все ключи попадают в общий список gates и автоматически биндятся.
const SYSTEMS_3_1 = [
  {
    title: 'Сердечно-сосудистая система',
    diseases: [
      { key: 'cvHypertension',        label: 'Гипертензия' },
      { key: 'cvArrhythmia',          label: 'Аритмии' },
      { key: 'cvProlapse',            label: 'Пролапсы клапанов' },
      { key: 'cvMyocardiodystrophy',  label: 'Миокардиодистрофия' },
      { key: 'cvMyocarditis',         label: 'Перенесённые миокардиты' }
    ]
  },
  {
    title: 'Эндокринная система',
    diseases: [
      { key: 'endoAit',               label: 'АИТ',                       abbrFull: 'аутоиммунный тиреоидит' },
      { key: 'endoHypothyroidism',    label: 'Гипотиреоз' },
      { key: 'endoHyperthyroidism',   label: 'Гипертиреоз' },
      { key: 'endoDiabetes',          label: 'Сахарный диабет' },
      { key: 'endoMetabolicSyndrome', label: 'Метаболический синдром' },
      { key: 'endoPcos',              label: 'СПКЯ',                      abbrFull: 'синдром поликистозных яичников', femaleOnly: true }
    ]
  },
  {
    title: 'ЖКТ',
    diseases: [
      { key: 'giGastritis',           label: 'Гастрит / язвенная болезнь' },
      { key: 'giGerd',                label: 'ГЭРБ',                      abbrFull: 'гастроэзофагеальная рефлюксная болезнь' },
      { key: 'giIbs',                 label: 'СРК',                       abbrFull: 'синдром раздражённого кишечника' },
      { key: 'giCholecystPancreatitis', label: 'Хронический холецистит / панкреатит' },
      { key: 'giLiver',               label: 'Заболевания печени',        placeholder: 'Гепатит в анамнезе, стеатоз — тип, давность' },
      { key: 'giIbd',                 label: 'ВЗК',                       abbrFull: 'воспалительные заболевания кишечника (Крон, язвенный колит)' },
      { key: 'giEatingDisorder',      label: 'РПП',                       abbrFull: 'расстройства пищевого поведения — анорексия, булимия, орторексия, компульсивное переедание' }
    ]
  },
  {
    title: 'Почки и мочевыделительная система',
    diseases: [
      { key: 'renalCkd',              label: 'ХБП',                       abbrFull: 'хроническая болезнь почек' },
      { key: 'renalStones',           label: 'МКБ',                       abbrFull: 'мочекаменная болезнь' },
      { key: 'renalUti',              label: 'Частые ИМП',                abbrFull: 'инфекции мочевыводящих путей' }
    ]
  },
  {
    title: 'Бронхолёгочная система',
    diseases: [
      { key: 'respAsthma',            label: 'Бронхиальная астма' },
      { key: 'respEib',               label: 'EIB',                       abbrFull: 'астма физического напряжения' },
      { key: 'respCopd',              label: 'ХОБЛ',                      abbrFull: 'хроническая обструктивная болезнь лёгких' },
      { key: 'respSinusitis',         label: 'Частые синуситы' }
    ]
  },
  {
    title: 'Нервная система и психика',
    diseases: [
      { key: 'cnsEpilepsy',           label: 'Эпилепсия' },
      { key: 'cnsMigraine',           label: 'Мигрени' },
      { key: 'cnsTbi',                label: 'Последствия ЧМТ',           abbrFull: 'черепно-мозговой травмы' },
      { key: 'cnsAnxiety',            label: 'Тревожные / депрессивные расстройства' }
    ]
  },
  {
    title: 'Кровь и иммунитет',
    diseases: [
      { key: 'bloodAnemia',           label: 'Анемия в анамнезе' },
      { key: 'bloodHbv',              label: 'Вирусный гепатит B',         abbrFull: 'HBV' },
      { key: 'bloodHcv',              label: 'Вирусный гепатит C',         abbrFull: 'HCV' },
      { key: 'bloodHsv',              label: 'Вирус простого герпеса',     abbrFull: 'HSV' },
      { key: 'bloodEbv',              label: 'Вирус Эпштейна-Барр',        abbrFull: 'EBV' },
      { key: 'bloodCmv',              label: 'Цитомегаловирус',            abbrFull: 'CMV' },
      { key: 'bloodHiv',              label: 'ВИЧ',                        abbrFull: 'HIV' },
      { key: 'bloodFrequentInfections', label: 'Частые ОРВИ / инфекции' }
    ]
  },
  {
    title: 'Опорно-двигательная система',
    diseases: [
      { key: 'muscHernias',           label: 'Грыжи позвоночника' },
      { key: 'muscProtrusions',       label: 'Протрузии' },
      { key: 'muscArthrosis',         label: 'Артрозы' },
      { key: 'muscCongenital',        label: 'Врождённые особенности',    placeholder: 'Плоскостопие, дисплазии и т.п.' }
    ]
  }
];

export function render(container, { onBack, onNext }) {
  const profile = getProfile();
  const a = profile.blocks[BLOCK_ID].answers;

  // Чтение данных из Блока 1 для cross-block адаптивности.
  const identityA = (profile.blocks.identity && profile.blocks.identity.answers) || {};
  const isFemale  = identityA.sex === 'f';
  const hasTue    = identityA.hasTue === 'yes';
  const isAmateur = profile.meta.level === 'amateur';

  // Гендерная фильтрация в 3.1: диагнозы с femaleOnly:true показываются
  // только женщинам (например, СПКЯ — заболевание яичников).
  const visibleSystems = SYSTEMS_3_1.map(sys => ({
    ...sys,
    diseases: sys.diseases.filter(d => !d.femaleOnly || isFemale)
  }));

  container.innerHTML = `
    <header class="step-header">
      <div class="step-eyebrow">Блок 3</div>
      <h1 class="step-title">Сведения о здоровье</h1>
      <p class="step-lead">Хронические заболевания, операции, травмы, аллергии и текущая терапия. Для каждого раздела сначала укажите «Есть / Нет»; детали — только если «Есть»</p>
    </header>

    <!-- 3.1 ХРОНИЧЕСКИЕ ЗАБОЛЕВАНИЯ -->
    <!-- Структура: системы → конкретные диагнозы. Каждый диагноз — свой гейт
         «Есть / Нет» с раскрывающимся textarea. Аббревиатуры (АИТ, ГЭРБ и т.п.)
         идут с расшифровкой в abbrFull — мелким серым рядом. -->
    <section class="form-section">
      <h2 class="form-section-title">1 Хронические заболевания и диагнозы</h2>
      ${visibleSystems.map(sys => `
        <h3 class="form-subtitle">${esc(sys.title)}</h3>
        <div class="disease-group">
          ${sys.diseases.map(d => gatedHtml(a, d.key, d.label, { ...d, required: sys.title !== 'Опорно-двигательная система' })).join('')}
        </div>
      `).join('')}
    </section>

    <!-- 3.2 ОПЕРАЦИИ, ГОСПИТАЛИЗАЦИИ, ТЯЖЁЛЫЕ ИНФЕКЦИИ -->
    <section class="form-section">
      <h2 class="form-section-title">2 Операции, госпитализации, тяжёлые инфекции</h2>
      ${gatedHtml(a, 'hadSurgeries',       'Хирургические вмешательства',        { placeholder: 'Вид операции, дата, осложнения', required: true })}
      ${gatedHtml(a, 'hadInfections',      'Тяжёлые инфекции за последние 2 года', { placeholder: 'COVID-19 (тяжесть, post-COVID синдром), другие — что и когда', required: true })}
      ${gatedHtml(a, 'hadTransfusions',    'Гемотрансфузии в анамнезе',          { placeholder: 'Когда и по каким показаниям', required: true })}
      ${gatedHtml(a, 'hadStressFractures', 'Стресс-переломы',                    { placeholder: 'Локализация, давность, число эпизодов', required: true })}
    </section>

    <!-- 3.3 ТРАВМЫ И ИХ ПОСЛЕДСТВИЯ -->
    <section class="form-section">
      <h2 class="form-section-title">3 Травмы и их последствия</h2>
      ${gatedHtml(a, 'hasActiveInjuries', 'Текущие активные травмы',                    { placeholder: 'Свежие повреждения мышц, связок, суставов — стадия, давность', required: true })}
      ${gatedHtml(a, 'hasChronicPain',    'Хронические тендинопатии или боли',          { placeholder: 'Локализация, интенсивность боли по шкале 0–10', required: true })}
      ${gatedHtml(a, 'usesNsaids',        'Регулярный приём НПВС или анальгетиков',     { placeholder: 'Какие препараты, как часто, по чьей рекомендации', detailLabel: 'Что и как', required: true })}

      ${isAmateur ? '' : `
        <!-- FILTER (level=elite | pro): для любителей реабилитационный статус
             в клиническом смысле обычно не отслеживается и формe не нужен. -->
        <div class="field">
          <label for="rehabStatus">Реабилитационный статус</label>
          <textarea id="rehabStatus" class="textarea" rows="3"
            placeholder="Иммобилизация в анамнезе, гипотрофия, мышечные дисбалансы — если есть. Можно оставить пустым"
          >${esc(a.rehabStatus)}</textarea>
        </div>
      `}
    </section>

    <!-- 3.4 АЛЛЕРГИИ И НЕПЕРЕНОСИМОСТИ -->
    <section class="form-section">
      <h2 class="form-section-title">4 Аллергии и непереносимости</h2>
      ${gatedHtml(a, 'hasDrugAllergy',         'Лекарственная аллергия',                  { placeholder: 'Препарат — тип реакции (крапивница, анафилаксия, отёк Квинке)', required: true })}
      ${gatedHtml(a, 'hasFoodIntolerance',     'Пищевая непереносимость или аллергия',    { placeholder: 'Лактоза, глютен, орехи, морепродукты, яйцо, соя — что именно', required: true })}
      ${gatedHtml(a, 'hasNutrientIntolerance', 'Непереносимость отдельных нутриентов',    { placeholder: 'Железо — ЖКТ-побочка; магний — диарея; витамин C — изжога и т.п.', required: true })}
      ${gatedHtml(a, 'hasPhysicalAllergy',     'Физические аллергии',                     { placeholder: 'Холодовая, солнечная, холинергическая крапивница; анафилаксия на нагрузку', required: true })}
      ${gatedHtml(a, 'hasInjectionReaction',   'Реакции на инъекционные формы',           { placeholder: 'Тошнота, головокружение, флебиты — на что', required: true })}
    </section>

    <!-- 3.5 ТЕКУЩАЯ ТЕРАПИЯ -->
    <section class="form-section">
      <h2 class="form-section-title">5 Текущая терапия</h2>
      ${gatedHtml(a, 'hasCurrentMeds',  'Постоянный приём лекарств',          { placeholder: 'Препарат — дозировка — частота — с какого времени', detailLabel: 'Что и в каких дозах' })}
      ${gatedHtml(a, 'hasSupplements',  'БАДы, спортпит, протеины, изотоники', { placeholder: 'Что именно, производитель, дозировка, частота' })}

      ${isFemale ? gatedHtml(a, 'hasContraceptives', 'Гормональные контрацептивы', { placeholder: 'Название, тип, длительность приёма' }) : ''}
      ${hasTue   ? gatedHtml(a, 'hasTueMeds',        'Препараты, назначенные по TUE', { placeholder: 'Что, в каких дозах, по какому диагнозу' }) : ''}

      ${gatedHtml(a, 'hasRecentlyStopped', 'Препараты, отменённые за последние 30 дней',
        { placeholder: 'Препарат и причина отмены', yesLabel: 'Есть', noLabel: 'Нет' })}
    </section>

    <nav class="step-nav">
      <button class="btn-ghost" id="back-btn" type="button">Назад</button>
      <button class="btn-primary" id="next-btn" type="button">Сохранить и продолжить</button>
    </nav>
  `;

  // ---------- Список всех гейтов, активных при текущих фильтрах ----------
  // 3.1: динамически из SYSTEMS_3_1. 3.2-3.5: статически.
  const gates = [
    // 3.1 — каждая болезнь отдельным гейтом (с учётом гендерных фильтров):
    ...visibleSystems.flatMap(sys => sys.diseases.map(d => d.key)),
    // 3.2:
    'hadSurgeries', 'hadInfections', 'hadTransfusions', 'hadStressFractures',
    // 3.3:
    'hasActiveInjuries', 'hasChronicPain', 'usesNsaids',
    // 3.4:
    'hasDrugAllergy', 'hasFoodIntolerance', 'hasNutrientIntolerance',
    'hasPhysicalAllergy', 'hasInjectionReaction',
    // 3.5:
    'hasCurrentMeds', 'hasSupplements', 'hasRecentlyStopped'
  ];
  if (isFemale) gates.push('hasContraceptives');
  if (hasTue)   gates.push('hasTueMeds');

  gates.forEach(key => bindGated(container, key));

  // ---------- Autosave для detail-полей и независимых textarea ----------
  const stringFields = ['rehabStatus', ...gates.map(k => k + 'Detail')];
  stringFields.forEach(id => bindField(container, id));

  // ---------- Навигация ----------
  container.querySelector('#back-btn').addEventListener('click', onBack);
  container.querySelector('#next-btn').addEventListener('click', () => {
    if (!validateRequired(container)) return;
    profile.blocks[BLOCK_ID].status = 'done';
    onNext();
  });
}

/* ---------------------------------------------------------------------------
   Хелперы (дубль с event.js — позже вынесем в общий модуль).
   --------------------------------------------------------------------------- */

// HTML одного «гейта» «Есть / Нет» в компактной раскладке.
//   [Метка (Расшифровка) *]      ( ) Есть   ( ) Нет
//   [textarea ─ только при «Есть»]
// abbrFull (если задан) — мелким серым после метки.
function gatedHtml(a, key, label, opts = {}) {
  const detailKey  = key + 'Detail';
  const yes        = a[key] === 'yes';
  const yesLabel   = opts.yesLabel   || 'Есть';
  const noLabel    = opts.noLabel    || 'Нет';
  const detailLbl  = opts.detailLabel;
  const required   = opts.required   ? ' <span class="req">*</span>' : '';
  const abbrFull   = opts.abbrFull   ? ` <span class="abbr-full">(${esc(opts.abbrFull)})</span>` : '';
  return `
    <div class="gated-item">
      <div class="gated-row">
        <label>${esc(label)}${abbrFull}${required}</label>
        <div class="radio-row">
          <label class="radio">
            <input type="radio" name="${key}" value="yes" ${yes ? 'checked' : ''}>
            ${esc(yesLabel)}
          </label>
          <label class="radio">
            <input type="radio" name="${key}" value="no" ${a[key] === 'no' ? 'checked' : ''}>
            ${esc(noLabel)}
          </label>
        </div>
      </div>
      <div class="gated-detail" id="${detailKey}-wrap" style="display:${yes ? 'block' : 'none'}">
        ${detailLbl ? `<label for="${detailKey}">${esc(detailLbl)}</label>` : ''}
        <textarea id="${detailKey}" class="textarea" rows="3"
          placeholder="${esc(opts.placeholder || 'Когда выявлено, степень, текущее лечение')}"
        >${esc(a[detailKey])}</textarea>
      </div>
    </div>
  `;
}

// Привязка радиогруппы гейта + раскрытие textarea. При «Нет» — обнуляем
// detail, чтобы в JSON не оставался текст после переключения на отрицание.
function bindGated(container, key) {
  const detailKey = key + 'Detail';
  const wrap = container.querySelector('#' + detailKey + '-wrap');
  if (!wrap) return;
  container.querySelectorAll(`input[name="${key}"]`).forEach(r => {
    r.addEventListener('change', () => {
      setAnswer(BLOCK_ID, key, r.value);
      const show = r.value === 'yes';
      wrap.style.display = show ? 'block' : 'none';
      if (!show) {
        const ta = container.querySelector('#' + detailKey);
        if (ta && ta.value) {
          ta.value = '';
          setAnswer(BLOCK_ID, detailKey, '');
        }
      }
    });
  });
}

function bindField(container, id, parse = v => v) {
  const el = container.querySelector('#' + id);
  if (!el) return;
  const handler = () => setAnswer(BLOCK_ID, id, parse(el.value));
  el.addEventListener('change', handler);
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    el.addEventListener('blur', handler);
  }
}

function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
