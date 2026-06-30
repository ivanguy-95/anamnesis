/* ---------------------------------------------------------------------------
   blocks/endocrine.js
   -------------------
   БЛОК 4. «Эндокринно-репродуктивный статус».
   Четыре секции по PDF-опроснику:
     4.1 Менструальная функция (Female Athlete Triad)  — только женщинам
     4.2 Male Athlete Triad                             — только мужчинам
     4.3 Костное здоровье                               — всем
     4.4 Эндокринные симптомы                           — всем

   Cross-block:
     • Берёт sex из Блока 1 для адаптивного рендера 4.1 / 4.2.
     • Стресс-переломы (hadStressFractures) уже собраны в Блоке 3.2 —
       в 4.3 не дублируем, добавляем явный note об этом.

   Все «есть/нет» поля — через gatedHtml; числовые — отдельно через bindField.
   --------------------------------------------------------------------------- */

import { getProfile, setAnswer } from '../state.js';

const BLOCK_ID = 'endocrine';

export function render(container, { onBack, onNext }) {
  const profile = getProfile();
  const a = profile.blocks[BLOCK_ID].answers;

  const identityA = (profile.blocks.identity && profile.blocks.identity.answers) || {};
  const isFemale = identityA.sex === 'f';
  const isMale   = identityA.sex === 'm';

  container.innerHTML = `
    <header class="step-header">
      <div class="step-eyebrow">Блок 4</div>
      <h1 class="step-title">Эндокринно-репродуктивный статус</h1>
      <p class="step-lead">Гормональная функция и репродуктивное здоровье. Эти вопросы помогают оценить риски, связанные с энергодоступностью (RED-S / Triad) и эндокринными нарушениями</p>
    </header>

    ${isFemale ? femaleSectionHtml(a) : ''}
    ${isMale   ? maleSectionHtml(a)   : ''}
    ${symptomsSectionHtml(a)}
    ${boneSectionHtml(a)}

    <nav class="step-nav">
      <button class="btn-ghost" id="back-btn" type="button">Назад</button>
      <button class="btn-primary" id="next-btn" type="button">Сохранить и продолжить</button>
    </nav>
  `;

  // ---------- Сборка списка активных гейтов ----------
  const gates = [
    // 4.3
    'hasDexa', 'hasBoneMarkers', 'hasFamilyOsteoporosis', 'hasLowBodyWeightHistory',
    // 4.4
    'hasGeneralSymptoms', 'hasHypothyroidSymptoms',
    'hasMetabolicSymptoms', 'hasKnownSubclinical'
  ];
  if (isFemale) gates.push(
    'hasOligomenorrhea', 'hasAmenorrhea', 'hasPrimaryAmenorrhea',
    'hasPms', 'hasDysmenorrhea',
    'hasPlannedPregnancy'
  );
  if (isMale) gates.push(
    'hasLibidoDecline', 'hasErectileDecline', 'hasMorningErectionsDecline',
    'hasMoodChanges', 'hasMotivationChanges', 'hasAggressionChanges',
    'hasGynecomastia', 'hasHairChanges'
  );

  gates.forEach(key => bindGated(container, key));

  // ---------- Простые радио (без раскрывающейся детали) ----------
  // Для женщин: текущая беременность, роды, лактация.
  if (isFemale) {
    ['hasCurrentPregnancy', 'hadDelivery', 'hasLactation']
      .forEach(key => bindSimpleRadio(container, key));
  }

  // ---------- Autosave: detail-поля гейтов + независимые числа ----------
  const stringFields = gates.map(k => k + 'Detail');
  stringFields.forEach(id => bindField(container, id));

  if (isFemale) {
    const num = v => (v === '' ? null : Number(v));
    ['menarcheAge', 'cycleLength', 'cyclesPerYear'].forEach(id => bindField(container, id, num));
  }

  // ---------- Навигация ----------
  container.querySelector('#back-btn').addEventListener('click', onBack);
  container.querySelector('#next-btn').addEventListener('click', () => {
    profile.blocks[BLOCK_ID].status = 'done';
    onNext();
  });
}

/* ---------------------------------------------------------------------------
   Секции — отдельные функции, чтобы render() оставался читаемым.
   --------------------------------------------------------------------------- */

function femaleSectionHtml(a) {
  return `
    <section class="form-section">
      <h2 class="form-section-title">1 Гормональный фон</h2>
      <p class="section-note">Female Athlete Triad — снижение энергодоступности приводит к нарушению цикла и плотности костей. Эти вопросы помогают оценить риск</p>

      <div class="field-row">
        <div class="field">
          <label for="menarcheAge">Возраст менархе, лет <span class="req">*</span></label>
          <input id="menarcheAge" class="input" type="number" min="8" max="25"
            value="${a.menarcheAge ?? ''}">
        </div>
        <div class="field">
          <label for="cycleLength">Средняя длина цикла, дней <span class="req">*</span></label>
          <input id="cycleLength" class="input" type="number" min="15" max="60"
            value="${a.cycleLength ?? ''}">
        </div>
        <div class="field">
          <label for="cyclesPerYear">Циклов в год <span class="req">*</span></label>
          <input id="cyclesPerYear" class="input" type="number" min="0" max="13"
            value="${a.cyclesPerYear ?? ''}">
        </div>
      </div>

      <div class="disease-group">
        ${gatedHtml(a, 'hasOligomenorrhea',    'Олигоменорея',         { abbrFull: 'циклы >35 дней или <9 циклов/год', required: true })}
        ${gatedHtml(a, 'hasAmenorrhea',        'Аменорея',             { abbrFull: 'отсутствие менструаций >90 дней', required: true })}
        ${gatedHtml(a, 'hasPrimaryAmenorrhea', 'Первичная аменорея',   { abbrFull: 'менархе не наступило до 15 лет', required: true })}
        ${gatedHtml(a, 'hasPms',               'ПМС',                  { abbrFull: 'предменструальный синдром', detailLabel: 'Как влияет на тренировки и старты', required: true })}
        ${gatedHtml(a, 'hasDysmenorrhea',      'Дисменорея',           { abbrFull: 'болезненные менструации', detailLabel: 'Как влияет на тренировки и старты', required: true })}

        ${simpleRadioHtml(a, 'hasCurrentPregnancy', 'Текущая беременность', 'Есть', 'Нет', true)}
        ${gatedHtml(a, 'hasPlannedPregnancy', 'Планируемая беременность', {
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'Когда планируется',
          placeholder: 'Например: в ближайшие 6 месяцев, через 1–2 года',
          required: true
        })}
        ${simpleRadioHtml(a, 'hadDelivery',         'Роды в анамнезе',        'Были', 'Не было', true)}
        ${simpleRadioHtml(a, 'hasLactation',        'Лактация в настоящее время', 'Есть', 'Нет', true)}
      </div>
    </section>
  `;
}

function maleSectionHtml(a) {
  return `
    <section class="form-section">
      <h2 class="form-section-title">1 Гормональный фон</h2>
      <p class="section-note">Снижение либидо или эректильной функции у выносливостных атлетов может быть признаком дефицита энергии, а не самостоятельной проблемой</p>

      <div class="disease-group">
        ${gatedHtml(a, 'hasLibidoDecline',           'Снижение либидо за 6–12 мес',              { required: true })}
        ${gatedHtml(a, 'hasErectileDecline',         'Снижение эректильной функции за 6–12 мес', { required: true })}
        ${gatedHtml(a, 'hasMorningErectionsDecline', 'Снижение частоты утренних эрекций',        { required: true })}
        ${gatedHtml(a, 'hasMoodChanges',             'Изменения настроения',                     { required: true })}
        ${gatedHtml(a, 'hasMotivationChanges',       'Снижение мотивации',                       { required: true })}
        ${gatedHtml(a, 'hasAggressionChanges',       'Изменения агрессивности',                  { required: true })}
        ${gatedHtml(a, 'hasGynecomastia',            'Гинекомастия',                             { required: true })}
        ${gatedHtml(a, 'hasHairChanges',             'Изменения волосяного покрова',             { required: true })}
      </div>
    </section>
  `;
}

function boneSectionHtml(a) {
  return `
    <section class="form-section">
      <h2 class="form-section-title">3 Костное здоровье</h2>
      <p class="section-note">Низкая плотность костей и нарушения костного обмена — частые последствия энергодефицита, недостатка витамина D и кальция у спортсменов. Эти вопросы помогают оценить риск и подобрать поддерживающие протоколы</p>

      <div class="disease-group">
        ${gatedHtml(a, 'hasDexa', 'DEXA-исследование',
          { abbrFull: 'двухэнергетическая рентгеновская абсорбциометрия — измерение плотности костей',
            detailLabel: 'Z-score / T-score, дата, регионы (поясница, бедро, всё тело)',
            help: 'DEXA — денситометрия для оценки плотности костей. Делается в клинике по направлению врача и не входит в рутинные обследования, поэтому у многих спортсменов её не было.' })}
        ${gatedHtml(a, 'hasBoneMarkers', 'Маркеры костного обмена',
          { detailLabel: 'Остеокальцин, P1NP, β-CrossLaps — что и какие значения',
            help: 'Это специальные анализы крови (остеокальцин, P1NP, β-CrossLaps). Назначаются врачом и обычно не входят в стандартный чек-ап.' })}
        ${gatedHtml(a, 'hasFamilyOsteoporosis', 'Остеопороз у родственников 1-й линии',
          { detailLabel: 'Кто и в каком возрасте' })}
        ${gatedHtml(a, 'hasLowBodyWeightHistory', 'Низкая масса тела в подростковом возрасте',
          { detailLabel: 'Когда и как долго' })}
      </div>
    </section>
  `;
}

function symptomsSectionHtml(a) {
  return `
    <section class="form-section">
      <h2 class="form-section-title">2 Эндокринные симптомы</h2>
      <p class="section-note">Жалобы по группам — для оценки возможной эндокринной дисрегуляции. Если симптомов нет — выбирайте «Нет»</p>

      <div class="disease-group">
        ${gatedHtml(a, 'hasGeneralSymptoms', 'Общие симптомы',
          { placeholder: 'Усталость, нарушения сна, прибавка/потеря массы без объяснения, выпадение волос, изменения кожи', required: true })}
        ${gatedHtml(a, 'hasHypothyroidSymptoms', 'Признаки сниженной функции щитовидной железы',
          { placeholder: 'Зябкость, склонность к запорам, замедленный пульс утром', required: true })}
        ${gatedHtml(a, 'hasMetabolicSymptoms', 'Признаки нарушений углеводного обмена',
          { placeholder: 'Жажда, полиурия (частое обильное мочеиспускание), ночная потливость', required: true })}
        ${gatedHtml(a, 'hasKnownSubclinical', 'Известные пограничные / субклинические состояния',
          { placeholder: 'Например: субклинический гипотиреоз, вторичная гиперпролактинемия', required: true })}
      </div>
    </section>
  `;
}

/* ---------------------------------------------------------------------------
   Хелперы (дубль с medical.js — позже вынесем в общий модуль).
   --------------------------------------------------------------------------- */

function gatedHtml(a, key, label, opts = {}) {
  const detailKey  = key + 'Detail';
  const yes        = a[key] === 'yes';
  const notChecked = a[key] === 'not_checked';
  const yesLabel   = opts.yesLabel   || 'Есть';
  const noLabel    = opts.noLabel    || 'Нет';
  const detailLbl  = opts.detailLabel;
  const required   = opts.required   ? ' <span class="req">*</span>' : '';
  const abbrFull   = opts.abbrFull   ? ` <span class="abbr-full">(${esc(opts.abbrFull)})</span>` : '';
  // Опция «?» с обоснованием и кнопкой «Не проверял» (см. help.js).
  const helpIcon = opts.help
    ? ` <button type="button" class="help-icon" aria-label="Пояснение" aria-expanded="false">?</button>`
    : '';
  return `
    <div class="gated-item${notChecked ? ' gated-item--notchecked' : ''}">
      <div class="gated-row">
        <label>${esc(label)}${abbrFull}${required}${helpIcon}</label>
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
      ${opts.help ? `
        <input type="radio" name="${key}" value="not_checked" class="nc-radio" ${notChecked ? 'checked' : ''} hidden>
        <div class="help-pop" hidden>
          <p class="help-pop-note">${esc(opts.help)}</p>
          <p class="help-pop-hint">Если не проверяли, нажмите на кнопку</p>
          <button type="button" class="help-pop-btn">Не проверял</button>
        </div>
      ` : ''}
      <div class="gated-detail" id="${detailKey}-wrap" style="display:${yes ? 'block' : 'none'}">
        ${detailLbl ? `<label for="${detailKey}">${esc(detailLbl)}</label>` : ''}
        <textarea id="${detailKey}" class="textarea" rows="3"
          placeholder="${esc(opts.placeholder || 'Когда выявлено, степень, текущее лечение')}"
        >${esc(a[detailKey])}</textarea>
      </div>
    </div>
  `;
}

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

// Простая радиогруппа «X / Y» без раскрывающейся детали — компактнее,
// чем gatedHtml с пустой textarea, для вопросов вида «было / не было».
function simpleRadioHtml(a, key, label, yesLabel = 'Да', noLabel = 'Нет', required = false) {
  const req = required ? ' <span class="req">*</span>' : '';
  return `
    <div class="gated-item">
      <div class="gated-row">
        <label>${esc(label)}${req}</label>
        <div class="radio-row">
          <label class="radio">
            <input type="radio" name="${key}" value="yes" ${a[key] === 'yes' ? 'checked' : ''}>
            ${esc(yesLabel)}
          </label>
          <label class="radio">
            <input type="radio" name="${key}" value="no"  ${a[key] === 'no'  ? 'checked' : ''}>
            ${esc(noLabel)}
          </label>
        </div>
      </div>
    </div>
  `;
}

function bindSimpleRadio(container, key) {
  container.querySelectorAll(`input[name="${key}"]`).forEach(r => {
    r.addEventListener('change', () => setAnswer(BLOCK_ID, key, r.value));
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
