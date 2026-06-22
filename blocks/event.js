/* ---------------------------------------------------------------------------
   blocks/event.js
   ---------------
   БЛОК 2. «Ключевые соревнования и периодизация».
   Три секции по PDF-опроснику:
     2.1 Ключевые соревнования   (название, дата, формат, место, климат)
     2.2 Периодизация            (этап, недели до старта, ключевые блоки)
     2.3 История стартов / схем  (гейт «был ли опыт?» → детали)

   Адаптивность:
     • raceFormat ≠ 'single_day' → открывается поле «Расписание стартов»
     • hasPriorSchemes === 'yes' → открываются textarea 2.3
     • Поле «Недель до старта» автозаполняется от raceDate, если пусто

   Все поля автосохраняются в state.
   --------------------------------------------------------------------------- */

import { getProfile, setAnswer } from '../state.js';
import { validateRequired } from '../validate.js';
import { initDatePickers } from '../datepicker.js';

const BLOCK_ID = 'event';

const FORMAT_OPTIONS = [
  { value: '',           label: '—' },
  { value: 'single_day', label: 'Один день' },
  { value: 'multi_day',  label: 'Многодневка' },
  { value: 'tour',       label: 'Тур' },
  { value: 'series',     label: 'Серия стартов' }
];

// Этапы по терминологии Кулиненкова (используются в PDF-опроснике).
const PHASE_OPTIONS = [
  { value: '',         label: '—' },
  { value: 'base',     label: 'Базовый' },
  { value: 'special',  label: 'Специально-подготовительный' },
  { value: 'precomp',  label: 'Предсоревновательный' },
  { value: 'comp',     label: 'Соревновательный' },
  { value: 'transit',  label: 'Переходный' },
  { value: 'recovery', label: 'Восстановительный' }
];

// Климат разбит на две независимые оси: температура и характер воздуха.
// Спортсмен выбирает по одному значению из каждой.
const TEMPERATURE_OPTIONS = [
  { value: '',       label: '—' },
  { value: 'hot',    label: 'Жара (>25°C)' },
  { value: 'normal', label: 'Норма (10–20°C)' },
  { value: 'cold',   label: 'Холодно (<10°C)' }
];

const AIR_OPTIONS = [
  { value: '',       label: '—' },
  { value: 'humid',  label: 'Влажный' },
  { value: 'dry',    label: 'Сухой' },
  { value: 'normal', label: 'Обычный' }
];

export function render(container, { onBack, onNext }) {
  const profile = getProfile();
  const a = profile.blocks[BLOCK_ID].answers;

  const isSingleDay     = a.raceFormat === 'single_day';
  const isMultiDay      = a.raceFormat && a.raceFormat !== 'single_day';
  const hasPriorSchemes = a.hasPriorSchemes === 'yes';
  // Фильтр по уровню: у любителей нет периодизации пик/тейпер, и упрощён
  // блок тренировочного процесса (без отдельной подсказки под полем).
  const isAmateur = profile.meta.level === 'amateur';

  container.innerHTML = `
    <header class="step-header">
      <div class="step-eyebrow">Блок 2</div>
      <h1 class="step-title">Ключевые соревнования и периодизация</h1>
      <p class="step-lead">Под какое событие подбираем схему и на каком этапе подготовки вы сейчас</p>
    </header>

    <!-- 2.1 ЦЕЛЕВОЕ СОБЫТИЕ -->
    <section class="form-section">
      <h2 class="form-section-title">1 Ключевые соревнования</h2>

      <div class="field">
        <label for="raceName">Название соревнования <span class="req">*</span></label>
        <input id="raceName" class="input" type="text" value="${esc(a.raceName)}">
      </div>

      <div class="field-row">
        <div class="field">
          <label for="raceDate">Дата старта <span class="req">*</span></label>
          <input id="raceDate" class="input" type="text" data-datepicker readonly value="${esc(a.raceDate)}">
        </div>
        <div class="field">
          <label for="raceFormat">Формат <span class="req">*</span></label>
          <select id="raceFormat" class="input">${optionsHtml(FORMAT_OPTIONS, a.raceFormat)}</select>
        </div>
      </div>

      <!-- Адаптивно:
           - «Один день»                          -> поле «Время старта»
           - «Многодневка / Тур / Серия стартов» -> textarea «Расписание стартов»
           Оба поля управляются одним select-ом raceFormat. -->
      <div class="field" id="raceStartTime-wrap"
        style="display:${isSingleDay ? 'block' : 'none'}">
        <label for="raceStartTime">Время старта</label>
        <input id="raceStartTime" class="input" type="time" value="${esc(a.raceStartTime)}">
        <div class="field-help">Локальное время старта в месте проведения. Используется для тайминга предсоревновательных приёмов</div>
      </div>

      <div class="field" id="raceSchedule-wrap"
        style="display:${isMultiDay ? 'block' : 'none'}">
        <label for="raceSchedule">Расписание стартов внутри события</label>
        <textarea id="raceSchedule" class="textarea" rows="3"
          placeholder="Утро/вечер, число попыток/забегов/боёв по дням"
        >${esc(a.raceSchedule)}</textarea>
      </div>

      <h3 class="form-subtitle">Место проведения</h3>
      ${locationFieldsHtml('race', a)}

      <!-- Гейт: если место тренировок отличается от места соревнований —
           в блоке 2.2 раскроется отдельный набор полей «Место тренировок». -->
      <div class="field">
        <label>Место тренировок совпадает с местом соревнований?</label>
        <div class="radio-row">
          <label class="radio">
            <input type="radio" name="trainingLocationSame" value="yes"
              ${a.trainingLocationSame === 'yes' ? 'checked' : ''}>
            Да
          </label>
          <label class="radio">
            <input type="radio" name="trainingLocationSame" value="no"
              ${a.trainingLocationSame === 'no' ? 'checked' : ''}>
            Нет
          </label>
        </div>
      </div>
    </section>

    <!-- 2.2 УЧЕБНО-ТРЕНИРОВОЧНЫЙ ПРОЦЕСС -->
    <section class="form-section">
      <h2 class="form-section-title">2 Учебно-тренировочный процесс</h2>

      <div class="field">
        <label for="currentPhase">Сегодняшний этап подготовки <span class="req">*</span></label>
        <select id="currentPhase" class="input">${optionsHtml(PHASE_OPTIONS, a.currentPhase)}</select>
      </div>

      <div class="field">
        <label for="weeksToStart">Недель до старта</label>
        <input id="weeksToStart" class="input" type="number" min="0" max="104"
          value="${a.weeksToStart ?? ''}">
        <div class="field-help">Если оставите пустым — рассчитается автоматически от даты старта. Можно переопределить вручную</div>
      </div>

      <!-- Любители: подсказка живёт внутри textarea как placeholder,
           без подписи снизу. Профи: подпись снизу. -->
      <div class="field">
        <label for="keyTrainingBlocks">${isAmateur ? 'Текущий тренировочный процесс' : 'Запланированные ключевые блоки'}</label>
        <textarea id="keyTrainingBlocks" class="textarea" rows="4"
          ${isAmateur ? 'placeholder="Подробно распишите, как вы тренируетесь сейчас? Сколько тренировок? Их периодичность и т.д."' : ''}
        >${esc(a.keyTrainingBlocks)}</textarea>
        ${isAmateur ? '' : '<div class="field-help">Подробно распишите свой текущий учебно-тренировочный процесс: какие циклы? сколько циклов? сколько тренировок? продолжительность тренировок и т.д.</div>'}
      </div>

      <!-- Прикрепить PDF с УТП. Файл читается через FileReader, сохраняется
           в state как { name, size, dataUrl } и переживает reload страницы
           (пока не превышен лимит localStorage). -->
      <div class="field">
        <label for="keyBlocksPdfInput">Прикрепить PDF с УТП</label>
        <input id="keyBlocksPdfInput" class="file-input" type="file" accept="application/pdf,.pdf">
        <div id="keyBlocksPdfStatus" class="file-status"></div>
        <div class="field-help">Максимум 4 МБ. Сохраняется вместе с анкетой в браузере</div>
      </div>

      <!-- Раскрывается, если в 2.1 отмечено «Место тренировок ≠ место соревнований». -->
      <div id="trainingLocation-wrap"
        style="display:${a.trainingLocationSame === 'no' ? 'block' : 'none'}">
        <h3 class="form-subtitle">Место тренировок</h3>
        ${locationFieldsHtml('training', a)}
      </div>

      ${isAmateur ? '' : `
        <!-- FILTER (level=pro): даты пика и тейпера применимы только к
             периодизированной подготовке профи. У любителей этих понятий нет. -->
        <div class="field-row">
          <div class="field">
            <label for="lastPeakDate">Дата последнего пика нагрузок</label>
            <input id="lastPeakDate" class="input" type="text" data-datepicker readonly value="${esc(a.lastPeakDate)}">
          </div>
          <div class="field">
            <label for="taperDate">Дата начала тейпера</label>
            <input id="taperDate" class="input" type="text" data-datepicker readonly value="${esc(a.taperDate)}">
          </div>
        </div>
      `}
    </section>

    <!-- 2.3 ПРЕДЫДУЩИЕ ПРОТОКОЛЫ -->
    <section class="form-section">
      <h2 class="form-section-title">3 Предыдущие протоколы</h2>

      <div class="field">
        <label>Был ли опыт фармакологической/нутритивной поддержки под старты?</label>
        <div class="radio-row">
          <label class="radio">
            <input type="radio" name="hasPriorSchemes" value="yes"
              ${a.hasPriorSchemes === 'yes' ? 'checked' : ''}>
            Да, был опыт
          </label>
          <label class="radio">
            <input type="radio" name="hasPriorSchemes" value="no"
              ${a.hasPriorSchemes === 'no' ? 'checked' : ''}>
            Нет, первый раз
          </label>
        </div>
      </div>

      <!-- Адаптивно: детали 2.3 раскрываются только если был предыдущий опыт. -->
      <div id="priorSchemes-wrap"
        style="display:${hasPriorSchemes ? 'block' : 'none'}">
        <div class="field">
          <label for="priorSchemesDesc">Какие схемы применялись</label>
          <textarea id="priorSchemesDesc" class="textarea" rows="3"
            placeholder="Препараты, дозы, длительность курсов"
          >${esc(a.priorSchemesDesc)}</textarea>
        </div>

        <div class="field">
          <label for="whatWorked">Что субъективно работало хорошо</label>
          <textarea id="whatWorked" class="textarea" rows="3"
            placeholder="Препараты, влиявшие на восстановление, энергию, переносимость нагрузок"
          >${esc(a.whatWorked)}</textarea>
        </div>

        <div class="field">
          <label for="whatDidntWork">Что не работало / была побочка</label>
          <textarea id="whatDidntWork" class="textarea" rows="3"
            placeholder="Тошнота, нарушение сна, нервозность, ЖКТ-симптомы — что и от чего"
          >${esc(a.whatDidntWork)}</textarea>
        </div>

        <div class="field">
          <label for="bestWorstResults">Лучший и худший результат за 12 мес</label>
          <textarea id="bestWorstResults" class="textarea" rows="3"
            placeholder="В каких условиях, что сопровождало"
          >${esc(a.bestWorstResults)}</textarea>
        </div>

        ${issueGroupHtml(a, 'hadFormCrashes',    'formCrashesReason',    'Срывы формы')}
        ${issueGroupHtml(a, 'hadPreRaceIllness', 'preRaceIllnessReason', 'Болезни перед стартом')}
        ${issueGroupHtml(a, 'hadUnderRecovery',  'underRecoveryReason',  'Недовосстановление')}
      </div>
    </section>

    <nav class="step-nav">
      <button class="btn-ghost" id="back-btn" type="button">Назад</button>
      <button class="btn-primary" id="next-btn" type="button">Сохранить и продолжить</button>
    </nav>
  `;

  // Кастомный календарь для полей-дат (raceDate, lastPeakDate, taperDate).
  initDatePickers(container);

  // ---------- Автоподсчёт «Недель до старта» ----------
  // Считаем разницу race_date − today в неделях, округляя в большую сторону.
  // НЕ перетираем ручной ввод: если пользователь сам поставил число — уважаем.
  const raceDateEl = container.querySelector('#raceDate');
  const weeksEl    = container.querySelector('#weeksToStart');
  function maybeAutoWeeks() {
    if (weeksEl.value !== '') return;
    if (!raceDateEl.value) return;
    const target = new Date(raceDateEl.dataset.iso || raceDateEl.value);
    if (isNaN(target.getTime())) return;
    const diffMs = target - new Date();
    const weeks = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24 * 7)));
    weeksEl.value = weeks;
    setAnswer(BLOCK_ID, 'weeksToStart', weeks);
  }
  raceDateEl.addEventListener('change', maybeAutoWeeks);
  maybeAutoWeeks(); // при первом рендере с уже сохранённой датой

  // ---------- Поля под формат события ----------
  // single_day  → показываем «Время старта», прячем «Расписание»
  // multi/tour/series → показываем «Расписание», прячем «Время старта»
  // пусто       → прячем оба
  // Неактуальное значение при сворачивании очищаем, чтобы в JSON не
  // оставалось мусора из прошлой попытки выбора формата.
  const formatEl     = container.querySelector('#raceFormat');
  const startWrap    = container.querySelector('#raceStartTime-wrap');
  const scheduleWrap = container.querySelector('#raceSchedule-wrap');
  formatEl.addEventListener('change', () => {
    const v = formatEl.value;
    const single = v === 'single_day';
    const multi  = v && v !== 'single_day';

    startWrap.style.display    = single ? 'block' : 'none';
    scheduleWrap.style.display = multi  ? 'block' : 'none';

    if (!single) {
      const t = container.querySelector('#raceStartTime');
      if (t && t.value) { t.value = ''; setAnswer(BLOCK_ID, 'raceStartTime', ''); }
    }
    if (!multi) {
      const t = container.querySelector('#raceSchedule');
      if (t && t.value) { t.value = ''; setAnswer(BLOCK_ID, 'raceSchedule', ''); }
    }
  });

  // ---------- Гейт «Место тренировок = место соревнований?» ----------
  // При «Нет» раскрывается блок 2.2 с теми же полями для места тренировок.
  // При «Да» — блок прячется и поля очищаются, чтобы в JSON не висели
  // тренировочные данные от предыдущей попытки.
  const trainingLocWrap = container.querySelector('#trainingLocation-wrap');
  container.querySelectorAll('input[name="trainingLocationSame"]').forEach(r => {
    r.addEventListener('change', () => {
      setAnswer(BLOCK_ID, 'trainingLocationSame', r.value);
      const show = r.value === 'no';
      trainingLocWrap.style.display = show ? 'block' : 'none';
      if (!show) {
        ['trainingLocation', 'trainingTemperature', 'trainingAirHumidity', 'trainingSurface']
          .forEach(id => {
            const el = container.querySelector('#' + id);
            if (el) el.value = '';
            setAnswer(BLOCK_ID, id, '');
          });
      }
    });
  });

  // ---------- Раскрытие деталей 2.3 по гейту «был ли опыт?» ----------
  const priorWrap = container.querySelector('#priorSchemes-wrap');
  container.querySelectorAll('input[name="hasPriorSchemes"]').forEach(r => {
    r.addEventListener('change', () => {
      setAnswer(BLOCK_ID, 'hasPriorSchemes', r.value);
      priorWrap.style.display = r.value === 'yes' ? 'block' : 'none';
    });
  });

  // ---------- Три гейтa «Было / Не было» с раскрытием причины ----------
  bindIssueGroup(container, 'hadFormCrashes',    'formCrashesReason');
  bindIssueGroup(container, 'hadPreRaceIllness', 'preRaceIllnessReason');
  bindIssueGroup(container, 'hadUnderRecovery',  'underRecoveryReason');

  // ---------- Загрузка PDF c УТП ----------
  bindPdfInput(container);

  // ---------- Autosave всех полей ----------
  const num = v => (v === '' ? null : Number(v));
  const stringFields = [
    'raceName', 'raceDate', 'raceFormat', 'raceStartTime', 'raceSchedule',
    'raceLocation', 'raceTemperature', 'raceAirHumidity', 'raceSurface',
    // Место тренировок (видимо только когда trainingLocationSame === 'no'):
    'trainingLocation', 'trainingTemperature', 'trainingAirHumidity', 'trainingSurface',
    'currentPhase', 'keyTrainingBlocks', 'lastPeakDate', 'taperDate',
    'priorSchemesDesc', 'whatWorked', 'whatDidntWork', 'bestWorstResults',
    // Причины для гейтов «Было / Не было» в 2.3:
    'formCrashesReason', 'preRaceIllnessReason', 'underRecoveryReason'
  ];
  const numberFields = ['weeksToStart'];
  stringFields.forEach(id => bindField(container, id));
  numberFields.forEach(id => bindField(container, id, num));

  // ---------- Навигация ----------
  container.querySelector('#back-btn').addEventListener('click', onBack);
  container.querySelector('#next-btn').addEventListener('click', () => {
    if (!validateRequired(container)) return;
    profile.blocks[BLOCK_ID].status = 'done';
    onNext();
  });
}

// ---------------------------------------------------------------------------
// Хелперы (дубль из identity.js — позже вынесем в общий модуль, когда блоков
// станет больше и форма стабилизируется).
// ---------------------------------------------------------------------------

function bindField(container, id, parse = v => v) {
  const el = container.querySelector('#' + id);
  if (!el) return;
  const handler = () => setAnswer(BLOCK_ID, id, parse(el.value));
  el.addEventListener('change', handler);
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    el.addEventListener('blur', handler);
  }
}

function optionsHtml(options, current) {
  return options.map(o =>
    `<option value="${o.value}" ${current === o.value ? 'selected' : ''}>${esc(o.label)}</option>`
  ).join('');
}

// Набор полей «Место»: город + температура + воздух + особенности.
// Используется дважды (raceLocation + trainingLocation) — поэтому хелпер.
// Принимает префикс id ('race' | 'training') и текущие ответы.
function locationFieldsHtml(prefix, a) {
  return `
    <div class="field">
      <label for="${prefix}Location">Город</label>
      <input id="${prefix}Location" class="input" type="text" value="${esc(a[prefix + 'Location'])}">
    </div>

    <div class="field-row">
      <div class="field">
        <label for="${prefix}Temperature">Температура</label>
        <select id="${prefix}Temperature" class="input">${optionsHtml(TEMPERATURE_OPTIONS, a[prefix + 'Temperature'])}</select>
      </div>
      <div class="field">
        <label for="${prefix}AirHumidity">Воздух</label>
        <select id="${prefix}AirHumidity" class="input">${optionsHtml(AIR_OPTIONS, a[prefix + 'AirHumidity'])}</select>
      </div>
    </div>

    <div class="field">
      <label for="${prefix}Surface">Особенности местности</label>
      <input id="${prefix}Surface" class="input" type="text"
        placeholder="Например: высокогорье, море, открытая местность"
        value="${esc(a[prefix + 'Surface'])}">
    </div>
  `;
}

function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------------------------------------------------------------------------
   Группа «Было / Не было» c раскрывающейся причиной (2.3)
   --------------------------------------------------------------------------- */

// HTML одной группы: радио + textarea причины. Видимость textarea
// инициализируется по состоянию из profile.
function issueGroupHtml(a, radioKey, reasonKey, title) {
  const yes = a[radioKey] === 'yes';
  return `
    <div class="field">
      <label>${esc(title)}</label>
      <div class="radio-row">
        <label class="radio">
          <input type="radio" name="${radioKey}" value="yes" ${yes ? 'checked' : ''}>
          Было
        </label>
        <label class="radio">
          <input type="radio" name="${radioKey}" value="no" ${a[radioKey] === 'no' ? 'checked' : ''}>
          Не было
        </label>
      </div>
    </div>
    <div class="field" id="${reasonKey}-wrap" style="display:${yes ? 'block' : 'none'}">
      <label for="${reasonKey}">Что произошло, причина</label>
      <textarea id="${reasonKey}" class="textarea" rows="3"
        placeholder="Когда и при каких обстоятельствах"
      >${esc(a[reasonKey])}</textarea>
    </div>
  `;
}

// Привязка радиогруппы + раскрытия. При «Не было» обнуляем причину,
// чтобы в JSON не оставался текст из прошлой попытки.
function bindIssueGroup(container, radioKey, reasonKey) {
  const wrap = container.querySelector('#' + reasonKey + '-wrap');
  container.querySelectorAll(`input[name="${radioKey}"]`).forEach(r => {
    r.addEventListener('change', () => {
      setAnswer(BLOCK_ID, radioKey, r.value);
      const show = r.value === 'yes';
      wrap.style.display = show ? 'block' : 'none';
      if (!show) {
        const ta = container.querySelector('#' + reasonKey);
        if (ta && ta.value) {
          ta.value = '';
          setAnswer(BLOCK_ID, reasonKey, '');
        }
      }
    });
  });
}

/* ---------------------------------------------------------------------------
   Загрузка PDF c УТП (2.2)
   ------------------------
   Файл читается через FileReader как dataURL (base64) и сохраняется в state
   вместе с метаданными { name, size, dataUrl }. Лимит 4 МБ — мягкая защита
   от переполнения квоты localStorage (~5 МБ на профиль).
   --------------------------------------------------------------------------- */

const PDF_MAX_BYTES = 4 * 1024 * 1024;

function bindPdfInput(container) {
  const input = container.querySelector('#keyBlocksPdfInput');
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > PDF_MAX_BYTES) {
      alert('Файл слишком большой (>4 МБ). Сожмите PDF или прикрепите другой');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAnswer(BLOCK_ID, 'keyBlocksPdf', {
        name: file.name,
        size: file.size,
        dataUrl: reader.result
      });
      renderPdfStatus(container);
      input.value = ''; // позволить повторно выбрать тот же файл
    };
    reader.onerror = () => alert('Не удалось прочитать файл');
    reader.readAsDataURL(file);
  });
  renderPdfStatus(container); // показать уже прикреплённый при загрузке страницы
}

function renderPdfStatus(container) {
  const status = container.querySelector('#keyBlocksPdfStatus');
  const pdf = getProfile().blocks[BLOCK_ID].answers.keyBlocksPdf;
  if (pdf && pdf.name) {
    const kb = pdf.size / 1024;
    const sizeStr = kb >= 1024 ? (kb / 1024).toFixed(1) + ' МБ' : Math.round(kb) + ' КБ';
    status.innerHTML = `
      <span class="file-attached">
        <span class="file-name">📎 ${esc(pdf.name)}</span>
        <span class="file-size">${sizeStr}</span>
        <button type="button" class="file-remove" id="keyBlocksPdfRemove" aria-label="Удалить файл">×</button>
      </span>
    `;
    container.querySelector('#keyBlocksPdfRemove').addEventListener('click', () => {
      setAnswer(BLOCK_ID, 'keyBlocksPdf', null);
      renderPdfStatus(container);
    });
  } else {
    status.innerHTML = '<span class="file-empty">Файл не выбран</span>';
  }
}
