/* ---------------------------------------------------------------------------
   blocks/identity.js
   ------------------
   БЛОК 1. «Паспорт спортсмена» — идентификация и базовые антропометрические
   данные. Состоит из трёх логических секций (1.1, 1.2, 1.3 по PDF-опроснику).

   Адаптивность (жёсткий фильтр по meta.level, v2):
     • level === 'elite'                → ВАДА-паспорт и история TUE, состав тела
     • level === 'elite' || 'pro'       → состав тела (% жира, метод, дата)
     • level === 'amateur'              → только базовая антропометрия
   Разряд внутри карточки спорта — единый селект для всех уровней
   (3-й юношеский → МСМК), фильтрация не нужна.

   ИМТ рассчитывается автоматически из роста и массы.
   Все поля автосохраняются в state по событию `change` / `blur`.

   Экспортирует render(container, { onBack, onNext }).
   --------------------------------------------------------------------------- */

import { getProfile, setAnswer } from '../state.js';
import { validateRequired } from '../validate.js';
import { initDatePickers } from '../datepicker.js';

const BLOCK_ID = 'identity';

// Ключевые слова командных видов спорта. Если введённое название содержит
// одну из этих подстрок (регистр игнорируется), показываем поле «Амплуа».
// Подстрочный матч важен, чтобы «Пляжный волейбол» и «Хоккей с шайбой»
// тоже определялись как командные.
const TEAM_SPORTS = [
  'волейбол', 'футбол', 'хоккей', 'баскетбол', 'гандбол',
  'регби', 'водное поло', 'флорбол', 'керлинг',
  'бейсбол', 'софтбол', 'лакросс', 'мини-футбол', 'футзал'
];

function isTeamSport(name) {
  if (!name) return false;
  const s = String(name).toLowerCase().trim();
  return TEAM_SPORTS.some(kw => s.includes(kw));
}

// Официальная российская лестница спортивных разрядов — от младшего
// юношеского до МСМК. Применима и к профи, и к любителям.
const RANK_OPTIONS = [
  { value: '',      label: '—' },
  { value: 'yth3',  label: '3-й юношеский разряд' },
  { value: 'yth2',  label: '2-й юношеский разряд' },
  { value: 'yth1',  label: '1-й юношеский разряд' },
  { value: 'adlt3', label: '3-й спортивный разряд' },
  { value: 'adlt2', label: '2-й спортивный разряд' },
  { value: 'adlt1', label: '1-й спортивный разряд' },
  { value: 'KMS',   label: 'КМС' },
  { value: 'MS',    label: 'МС' },
  { value: 'MSMK',  label: 'МСМК' }
];

export function render(container, { onBack, onNext }) {
  const profile = getProfile();
  const a = profile.blocks[BLOCK_ID].answers;

  // Фильтры по уровню (v2):
  //   isElite       — только «Элита». ВАДА-паспорт и TUE имеют смысл лишь здесь.
  //   showBodyComp  — «Элита» и «Профи». У любителей данных по составу тела
  //                   обычно нет и они не нужны схеме.
  const level = profile.meta.level;
  const isElite      = level === 'elite';
  const showBodyComp = level === 'elite' || level === 'pro';

  // Миграция: раньше хранились отдельные поля sport/role/rank/yearsInSport
  // как строки/числа на уровне блока. Теперь — массив `sports` с собственным
  // стажем, амплуа и разрядом для каждого вида.
  if (!Array.isArray(a.sports)) {
    a.sports = [{
      name: a.sport || '',
      years: a.yearsInSport ?? null,
      role: a.role || '',
      rank: typeof a.rank === 'string' && RANK_OPTIONS.some(o => o.value === a.rank)
        ? a.rank : ''
    }];
    setAnswer(BLOCK_ID, 'sports', a.sports);
  } else {
    // Если массив уже есть, но элементы без `years` (из более ранней схемы) —
    // дозаполняем: первой карточке переносим старое top-level значение,
    // остальным ставим null.
    let dirty = false;
    a.sports.forEach((s, i) => {
      if (!('years' in s)) {
        s.years = i === 0 ? (a.yearsInSport ?? null) : null;
        dirty = true;
      }
    });
    if (dirty) setAnswer(BLOCK_ID, 'sports', a.sports);
  }

  container.innerHTML = `
    <header class="step-header">
      <div class="step-eyebrow">Блок 1</div>
      <h1 class="step-title">Паспорт спортсмена</h1>
      <p class="step-lead">Идентификация, антропометрия и спортивная квалификация. Поля со звёздочкой обязательны</p>
    </header>

    <!-- 1.1 ПАСПОРТНАЯ ЧАСТЬ -->
    <section class="form-section">
      <h2 class="form-section-title">1 Паспортная часть</h2>

      <div class="field">
        <label for="fullName">ФИО <span class="req">*</span></label>
        <input id="fullName" class="input" type="text" autocomplete="name"
          value="${esc(a.fullName)}">
      </div>

      <div class="field">
        <label for="birthDate">Дата рождения <span class="req">*</span></label>
        <input id="birthDate" class="input" type="text" data-datepicker readonly value="${esc(a.birthDate)}">
        <div class="field-help">Полная дата нужна для расчёта биологического возраста</div>
      </div>

      <div class="field">
        <label>Биологический пол <span class="req">*</span></label>
        <div class="radio-row">
          <label class="radio">
            <input type="radio" name="sex" value="m" ${a.sex === 'm' ? 'checked' : ''}>
            Мужской
          </label>
          <label class="radio">
            <input type="radio" name="sex" value="f" ${a.sex === 'f' ? 'checked' : ''}>
            Женский
          </label>
        </div>
      </div>

      <div class="field">
        <label for="citizenship">Гражданство</label>
        <input id="citizenship" class="input" type="text" value="${esc(a.citizenship)}">
      </div>

      <div class="field">
        <label for="trainingCountry">Страна тренировок</label>
        <input id="trainingCountry" class="input" type="text" value="${esc(a.trainingCountry)}">
        <div class="field-help">Важно для оценки доступности препаратов в конкретной юрисдикции</div>
      </div>
    </section>

    <!-- 1.2 АНТРОПОМЕТРИЯ И КОМПОЗИЦИЯ ТЕЛА -->
    <section class="form-section">
      <h2 class="form-section-title">2 Антропометрия и композиция тела</h2>

      <div class="field-row">
        <div class="field">
          <label for="heightCm">Рост, см <span class="req">*</span></label>
          <input id="heightCm" class="input" type="number"
            min="100" max="250" step="0.5" value="${a.heightCm ?? ''}">
        </div>
        <div class="field">
          <label for="weightKg">Масса сегодня, кг <span class="req">*</span></label>
          <input id="weightKg" class="input" type="number"
            min="30" max="250" step="0.1" value="${a.weightKg ?? ''}">
        </div>
      </div>

      <div class="field">
        <label>ИМТ <span class="field-help-inline">— рассчитывается автоматически</span></label>
        <input id="bmi" class="input" type="text" readonly value="${a.bmi ?? ''}">
      </div>

      <h3 class="form-subtitle">Стабильная масса за последние 6–12 месяцев</h3>
      <div class="field-row">
        <div class="field">
          <label for="weightAvgKg">Средняя, кг</label>
          <input id="weightAvgKg" class="input" type="number"
            min="30" max="250" step="0.1" value="${a.weightAvgKg ?? ''}">
        </div>
        <div class="field">
          <label for="weightMinKg">Минимум, кг</label>
          <input id="weightMinKg" class="input" type="number"
            min="30" max="250" step="0.1" value="${a.weightMinKg ?? ''}">
        </div>
        <div class="field">
          <label for="weightMaxKg">Максимум, кг</label>
          <input id="weightMaxKg" class="input" type="number"
            min="30" max="250" step="0.1" value="${a.weightMaxKg ?? ''}">
        </div>
      </div>

      <!-- Раскрывающийся блок «Целевая масса»: видим только если клиент
           выбрал «Нужна». Это бережёт форму от лишнего поля у тех,
           кому соревновательная масса нерелевантна (большинство циклических
           видов спорта, командные игры и т.п.). -->
      <div class="field">
        <label>Целевая соревновательная масса</label>
        <div class="field-help">Применимо для единоборств, лёгких категорий, эстетических видов</div>
        <div class="radio-row">
          <label class="radio">
            <input type="radio" name="targetWeightNeeded" value="yes"
              ${a.targetWeightNeeded === 'yes' ? 'checked' : ''}>
            Нужна
          </label>
          <label class="radio">
            <input type="radio" name="targetWeightNeeded" value="no"
              ${a.targetWeightNeeded === 'no' ? 'checked' : ''}>
            Не нужна
          </label>
        </div>
      </div>
      <div class="field" id="targetWeightKg-wrap"
        style="display:${a.targetWeightNeeded === 'yes' ? 'block' : 'none'}">
        <label for="targetWeightKg">Целевая масса, кг</label>
        <input id="targetWeightKg" class="input" type="number"
          min="30" max="250" step="0.1" value="${a.targetWeightKg ?? ''}">
      </div>

      ${showBodyComp ? `
        <!-- FILTER (level=elite | pro): «Состав тела» (% жира, % сухой массы,
             метод, дата) запрашиваем у элиты и профи. У любителей таких данных
             обычно нет и они не используются для расчёта схемы. -->
        <h3 class="form-subtitle">Состав тела</h3>
        <div class="field-row">
          <div class="field">
            <label for="bodyFatPct">% жира</label>
            <input id="bodyFatPct" class="input" type="number"
              min="0" max="60" step="0.1" value="${a.bodyFatPct ?? ''}">
          </div>
          <div class="field">
            <label for="leanMassPct">% сухой массы</label>
            <input id="leanMassPct" class="input" type="number"
              min="0" max="100" step="0.1" value="${a.leanMassPct ?? ''}">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="bodyCompMethod">Метод измерения</label>
            <select id="bodyCompMethod" class="input">
              <option value="">—</option>
              <option value="DEXA"    ${a.bodyCompMethod === 'DEXA'    ? 'selected' : ''}>DEXA</option>
              <option value="BIA"     ${a.bodyCompMethod === 'BIA'     ? 'selected' : ''}>BIA (биоимпеданс)</option>
              <option value="caliper" ${a.bodyCompMethod === 'caliper' ? 'selected' : ''}>Калипер</option>
              <option value="other"   ${a.bodyCompMethod === 'other'   ? 'selected' : ''}>Другое</option>
            </select>
          </div>
          <div class="field">
            <label for="bodyCompDate">Дата последнего измерения</label>
            <input id="bodyCompDate" class="input" type="text" data-datepicker readonly value="${esc(a.bodyCompDate)}">
          </div>
        </div>
      ` : ''}
    </section>

    <!-- 1.3 СПОРТИВНАЯ КВАЛИФИКАЦИЯ -->
    <section class="form-section">
      <h2 class="form-section-title">3 Спортивная квалификация</h2>

      <!-- Список видов спорта: для каждого свой блок с амплуа (если командный)
           и разрядом. Поле «Дисциплина» убрано — в большинстве случаев
           уточнение дисциплины поглощается названием вида спорта или амплуа. -->
      <div id="sports-list">${a.sports.map((s, i) => sportItemHtml(s, i)).join('')}</div>
      <button class="btn-ghost btn-add-sport" id="add-sport" type="button">+ Добавить вид спорта</button>

      <!-- Стаж в каждом виде спорта живёт внутри карточки.
           Здесь — только общий тренировочный стаж по всем видам. -->
      <div class="field" style="margin-top:20px;">
        <label for="yearsTraining">Общий тренировочный стаж, лет</label>
        <input id="yearsTraining" class="input" type="number"
          min="0" max="80" value="${a.yearsTraining ?? ''}">
        <div class="field-help">Сумма лет регулярных тренировок во всех видах суммарно</div>
      </div>

      ${isElite ? `
        <!-- FILTER (level=elite): ВАДА-паспорт и история TUE — только для
             элиты. Профи частных стартов и тем более любители биопаспорт
             ВАДА не оформляют и TUE не подают. -->
        <div class="field">
          <label>Биологический паспорт ВАДА</label>
          <div class="radio-row">
            <label class="radio">
              <input type="radio" name="wadaPassport" value="yes"
                ${a.wadaPassport === 'yes' ? 'checked' : ''}>
              Есть
            </label>
            <label class="radio">
              <input type="radio" name="wadaPassport" value="no"
                ${a.wadaPassport === 'no' ? 'checked' : ''}>
              Нет
            </label>
          </div>
        </div>

        <div class="field" id="wadaFederation-wrap"
          style="display:${a.wadaPassport === 'yes' ? 'block' : 'none'}">
          <label for="wadaFederation">Федерация</label>
          <input id="wadaFederation" class="input" type="text" value="${esc(a.wadaFederation)}">
        </div>

        <!-- Гейт «Есть / Нет» для TUE + раскрывающийся info-блок с пояснением.
             Детали (какие препараты, по каким показаниям) появляются только
             при «Есть» — чтобы не нагружать форму, если разрешения нет. -->
        <div class="field">
          <div class="label-row">
            <label>Исторические TUE</label>
            <button type="button" class="info-icon" id="tueInfoBtn"
              aria-label="Что такое TUE?" aria-expanded="false">i</button>
          </div>
          <div class="info-text" id="tueInfoText" hidden>
            TUE (Therapeutic Use Exemption) — официальное разрешение от антидопингового
            агентства принимать препарат из запрещённого списка WADA по медицинским
            показаниям. Например, ингалятор при бронхиальной астме или инсулин при
            диабете. Оформляется заранее на конкретное вещество, дозу и срок
          </div>
          <div class="radio-row">
            <label class="radio">
              <input type="radio" name="hasTue" value="yes"
                ${a.hasTue === 'yes' ? 'checked' : ''}>
              Есть
            </label>
            <label class="radio">
              <input type="radio" name="hasTue" value="no"
                ${a.hasTue === 'no' ? 'checked' : ''}>
              Нет
            </label>
          </div>
        </div>

        <div class="field" id="tueHistory-wrap"
          style="display:${a.hasTue === 'yes' ? 'block' : 'none'}">
          <label for="tueHistory">Детали TUE</label>
          <textarea id="tueHistory" class="textarea" rows="3"
            placeholder="Какие препараты, по каким показаниям, статус (действующее / закрытое)"
          >${esc(a.tueHistory)}</textarea>
        </div>
      ` : ''}
    </section>

    <nav class="step-nav">
      <button class="btn-ghost" id="back-btn" type="button">Назад</button>
      <button class="btn-primary" id="next-btn" type="button">Сохранить и продолжить</button>
    </nav>
  `;

  // Кастомный календарь для полей-дат (birthDate, bodyCompDate).
  initDatePickers(container);

  // ---------- Автоматический расчёт ИМТ ----------
  // ИМТ = масса (кг) / рост² (м). Пересчитываем при любом изменении
  // роста или массы; сохраняем в state как число с одним знаком после запятой.
  const heightEl = container.querySelector('#heightCm');
  const weightEl = container.querySelector('#weightKg');
  const bmiEl    = container.querySelector('#bmi');
  function recomputeBmi() {
    const h = parseFloat(heightEl.value);
    const w = parseFloat(weightEl.value);
    if (h > 0 && w > 0) {
      const bmi = +(w / (h / 100) ** 2).toFixed(1);
      bmiEl.value = bmi;
      setAnswer(BLOCK_ID, 'bmi', bmi);
    } else {
      bmiEl.value = '';
      setAnswer(BLOCK_ID, 'bmi', null);
    }
  }
  heightEl.addEventListener('input', recomputeBmi);
  weightEl.addEventListener('input', recomputeBmi);

  // ---------- Автосохранение полей ----------
  // На каждое изменение пишем в state. Дёшево по перфу и убирает риск
  // потери ответов при случайном reload или закрытии вкладки.
  const num = v => (v === '' ? null : Number(v));
  const txt = v => v;

  const stringFields = [
    'fullName', 'birthDate', 'citizenship', 'trainingCountry',
    // sport / discipline / role / rank переехали внутрь массива `sports`
    // и привязываются в bindSportsList ниже.
    'bodyCompMethod', 'bodyCompDate',
    'wadaFederation', 'tueHistory'
  ];
  const numberFields = [
    'heightCm', 'weightKg',
    'weightAvgKg', 'weightMinKg', 'weightMaxKg', 'targetWeightKg',
    'bodyFatPct', 'leanMassPct',
    // yearsInSport — теперь per-sport внутри массива `sports`
    'yearsTraining'
  ];
  stringFields.forEach(id => bindField(container, id, txt));
  numberFields.forEach(id => bindField(container, id, num));

  // Radio-группы — слушаем `change` на всех радио-кнопках одного name.
  bindRadioGroup(container, 'sex');

  // ВАДА-паспорт: при «Оформлен» раскрываем поле «Федерация»,
  // при «Нет» — прячем и чистим значение, чтобы в JSON не оставалось
  // устаревшее название федерации.
  if (isElite) {
    const fedWrap = container.querySelector('#wadaFederation-wrap');
    container.querySelectorAll('input[name="wadaPassport"]').forEach(r => {
      r.addEventListener('change', () => {
        setAnswer(BLOCK_ID, 'wadaPassport', r.value);
        const show = r.value === 'yes';
        fedWrap.style.display = show ? 'block' : 'none';
        if (!show) {
          const fed = container.querySelector('#wadaFederation');
          if (fed && fed.value) {
            fed.value = '';
            setAnswer(BLOCK_ID, 'wadaFederation', '');
          }
        }
      });
    });

    // TUE: кнопка-инфо раскрывает пояснение, радио «Есть / Нет» —
    // раскрывает/прячет textarea с деталями (с очисткой при «Нет»).
    const infoBtn  = container.querySelector('#tueInfoBtn');
    const infoText = container.querySelector('#tueInfoText');
    infoBtn.addEventListener('click', () => {
      const expanded = infoBtn.getAttribute('aria-expanded') === 'true';
      infoBtn.setAttribute('aria-expanded', String(!expanded));
      infoText.hidden = expanded;
    });

    const tueWrap = container.querySelector('#tueHistory-wrap');
    container.querySelectorAll('input[name="hasTue"]').forEach(r => {
      r.addEventListener('change', () => {
        setAnswer(BLOCK_ID, 'hasTue', r.value);
        const show = r.value === 'yes';
        tueWrap.style.display = show ? 'block' : 'none';
        if (!show) {
          const ta = container.querySelector('#tueHistory');
          if (ta && ta.value) {
            ta.value = '';
            setAnswer(BLOCK_ID, 'tueHistory', '');
          }
        }
      });
    });
  }

  // Список видов спорта (карточки + кнопка «Добавить»).
  bindSportsList(container);

  // Раскрывающийся блок «Целевая масса». При переключении «Нужна / Не нужна»
  // показываем/прячем поле ввода. При «Не нужна» обнуляем сохранённое
  // значение, чтобы в профиле не осталось устаревшего числа.
  const tgtWrap = container.querySelector('#targetWeightKg-wrap');
  container.querySelectorAll('input[name="targetWeightNeeded"]').forEach(r => {
    r.addEventListener('change', () => {
      setAnswer(BLOCK_ID, 'targetWeightNeeded', r.value);
      if (r.value === 'yes') {
        tgtWrap.style.display = 'block';
      } else {
        tgtWrap.style.display = 'none';
        const input = container.querySelector('#targetWeightKg');
        if (input) input.value = '';
        setAnswer(BLOCK_ID, 'targetWeightKg', null);
      }
    });
  });

  // ---------- Навигация ----------
  container.querySelector('#back-btn').addEventListener('click', onBack);
  container.querySelector('#next-btn').addEventListener('click', () => {
    if (!validateRequired(container)) return;
    profile.blocks[BLOCK_ID].status = 'done';
    onNext();
  });
}

// Привязать обычное input/textarea/select-поле к state по id.
function bindField(container, id, parse) {
  const el = container.querySelector('#' + id);
  if (!el) return;
  const handler = () => setAnswer(BLOCK_ID, id, parse(el.value));
  el.addEventListener('change', handler);
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    el.addEventListener('blur', handler);
  }
}

// Привязать группу <input type="radio" name="..."> к state по имени группы.
function bindRadioGroup(container, name) {
  container.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach(r => {
    r.addEventListener('change', () => setAnswer(BLOCK_ID, name, r.value));
  });
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
   Список видов спорта
   --------------------
   Внутри одного БЛОКа 1 спортсмен может указать несколько видов спорта.
   Для каждого — отдельная карточка с полями: название, амплуа (только для
   командных видов) и разряд (общая лестница 3 юн. → МСМК). Подсказка у
   разряда синхронизирована с названием вида: «по «Триатлон»».
   --------------------------------------------------------------------------- */

// HTML одной карточки вида спорта. `idx` нужен, чтобы привязать обработчики
// к конкретному элементу массива `sports`.
function sportItemHtml(s, idx) {
  const showRole = isTeamSport(s.name);
  const rankHint = s.name && s.name.trim() ? `по «${esc(s.name.trim())}»` : '';
  const options = RANK_OPTIONS.map(o =>
    `<option value="${o.value}" ${s.rank === o.value ? 'selected' : ''}>${esc(o.label)}</option>`
  ).join('');
  return `
    <div class="sport-item" data-idx="${idx}">
      <button class="sport-remove" type="button" aria-label="Удалить вид спорта" title="Удалить">×</button>

      <div class="field" style="margin-bottom:10px;">
        <label>Вид спорта <span class="req">*</span></label>
        <input class="input sport-name" type="text" data-key="name" value="${esc(s.name)}">
      </div>

      <div class="field" style="margin-bottom:10px;">
        <label>Стаж в этом виде, лет</label>
        <input class="input sport-years" type="number" data-key="years"
          min="0" max="80" step="1" value="${s.years ?? ''}">
      </div>

      <div class="field sport-role-wrap" style="margin-bottom:10px; display:${showRole ? 'block' : 'none'};">
        <label>Амплуа / специализация</label>
        <input class="input sport-role" type="text" data-key="role"
          placeholder="Например: нападающий, защитник, либеро" value="${esc(s.role)}">
        <div class="field-help">Появилось, потому что выбран командный вид спорта</div>
      </div>

      <div class="field" style="margin-bottom:0;">
        <label>Спортивный разряд <span class="rank-hint field-help-inline">${rankHint}</span></label>
        <select class="input sport-rank" data-key="rank">${options}</select>
      </div>
    </div>
  `;
}

// Полный перерендер списка карточек (нужен при добавлении/удалении, чтобы
// индексы карточек и data-idx остались согласованы с массивом). При
// изменении только текста внутри карточки список НЕ перерендеривается,
// чтобы не дёргать фокус.
function renderSportsList(container) {
  const list = container.querySelector('#sports-list');
  const sports = getProfile().blocks[BLOCK_ID].answers.sports || [];
  list.innerHTML = sports.map((s, i) => sportItemHtml(s, i)).join('');
  list.querySelectorAll('.sport-item').forEach(el => bindSportItem(container, el));
  updateRemoveButtons(list);
}

function bindSportsList(container) {
  const list = container.querySelector('#sports-list');
  list.querySelectorAll('.sport-item').forEach(el => bindSportItem(container, el));
  updateRemoveButtons(list);

  container.querySelector('#add-sport').addEventListener('click', () => {
    const sports = getProfile().blocks[BLOCK_ID].answers.sports || [];
    sports.push({ name: '', years: null, role: '', rank: '' });
    setAnswer(BLOCK_ID, 'sports', sports);
    renderSportsList(container);
    // Фокус на пустое имя только что добавленного вида.
    const items = container.querySelectorAll('.sport-item');
    items[items.length - 1].querySelector('.sport-name').focus();
  });
}

function bindSportItem(container, el) {
  const idx = parseInt(el.dataset.idx, 10);
  const nameInput = el.querySelector('.sport-name');
  const roleInput = el.querySelector('.sport-role');
  const rankSelect = el.querySelector('.sport-rank');
  const roleWrap = el.querySelector('.sport-role-wrap');
  const rankHint = el.querySelector('.rank-hint');
  const removeBtn = el.querySelector('.sport-remove');

  function save(key, value) {
    const sports = getProfile().blocks[BLOCK_ID].answers.sports || [];
    if (!sports[idx]) return;
    sports[idx][key] = value;
    setAnswer(BLOCK_ID, 'sports', sports);
  }

  // Имя вида — пересчитываем видимость амплуа и подсказку у разряда на лету.
  nameInput.addEventListener('input', () => {
    const v = nameInput.value;
    save('name', v);
    const isTeam = isTeamSport(v);
    roleWrap.style.display = isTeam ? 'block' : 'none';
    rankHint.textContent = v.trim() ? `по «${v.trim()}»` : '';
    // Если ушли с командного вида — амплуа теряет смысл, чистим значение.
    if (!isTeam && roleInput.value) {
      roleInput.value = '';
      save('role', '');
    }
  });

  // Стаж в виде — число; пустую строку сохраняем как null,
  // чтобы в JSON не было пары yearsInSport: "".
  const yearsInput = el.querySelector('.sport-years');
  const saveYears = () => save('years', yearsInput.value === '' ? null : Number(yearsInput.value));
  yearsInput.addEventListener('change', saveYears);
  yearsInput.addEventListener('blur',   saveYears);

  // Амплуа и разряд — простой autosave.
  roleInput.addEventListener('blur',   () => save('role', roleInput.value));
  roleInput.addEventListener('change', () => save('role', roleInput.value));
  rankSelect.addEventListener('change', () => save('rank', rankSelect.value));

  // Удалить вид. Запрещаем удалять последний — список не может быть пустым.
  removeBtn.addEventListener('click', () => {
    const sports = getProfile().blocks[BLOCK_ID].answers.sports || [];
    if (sports.length <= 1) return;
    sports.splice(idx, 1);
    setAnswer(BLOCK_ID, 'sports', sports);
    renderSportsList(container);
  });
}

function updateRemoveButtons(list) {
  const items = list.querySelectorAll('.sport-item');
  items.forEach(it => {
    it.querySelector('.sport-remove').style.display = items.length > 1 ? 'inline-block' : 'none';
  });
}
