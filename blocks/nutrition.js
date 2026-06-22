/* ---------------------------------------------------------------------------
   blocks/nutrition.js
   -------------------
   БЛОК 5. «Нутритивный анамнез и энергодоступность».
   Четыре секции по PDF-опроснику:
     5.1 Текущий рацион                       (тип диеты, БЖУ, ритм)
     5.2 Гидратация и электролиты              (вода, пот, изотоники)
     5.3 Энергодоступность и риски             (сушки, гипогликемии, LEAF-Q/LEAM-Q)
     5.4 Источник БАДов и WADA-сертификация    (откуда покупаются, batch-сертификаты)

   Пересечения с прошлыми блоками — НЕ дублируем:
     • РПП в анамнезе      → Блок 3.1 (ЖКТ → giEatingDisorder)
     • Лекарственные аллергии → Блок 3.4
     • Список БАДов и спортпита → Блок 3.5 (hasSupplements)
       Здесь только источник и сертификация.
   --------------------------------------------------------------------------- */

import { getProfile, setAnswer } from '../state.js';

const BLOCK_ID = 'nutrition';

const DIET_OPTIONS = [
  { value: '',                    label: '—' },
  { value: 'omnivorous',          label: 'Всеядность' },
  { value: 'vegetarian',          label: 'Вегетарианство' },
  { value: 'vegan',               label: 'Веганство' },
  { value: 'keto',                label: 'Кето' },
  { value: 'intermittentFasting', label: 'Интервальное голодание' },
  { value: 'lowCarb',             label: 'Низкоуглеводная' },
  { value: 'other',               label: 'Другое' }
];

const SWEAT_OPTIONS = [
  { value: '',         label: '—' },
  { value: 'light',    label: 'Слабое' },
  { value: 'moderate', label: 'Умеренное' },
  { value: 'heavy',    label: 'Сильное' }
];

const SUPPLEMENT_SOURCE_OPTIONS = [
  { value: '',                    label: '—' },
  { value: 'pharmacyRu',          label: 'Только в аптеке РФ' },
  { value: 'foreignViaResellers', label: 'Зарубежные через посредников' },
  { value: 'personalImport',      label: 'Лично из-за границы' },
  { value: 'mixed',               label: 'Комбинация / другое' }
];

export function render(container, { onBack, onNext }) {
  const profile = getProfile();
  const a = profile.blocks[BLOCK_ID].answers;
  const isAmateur = profile.meta.level === 'amateur';

  container.innerHTML = `
    <header class="step-header">
      <div class="step-eyebrow">Блок 5</div>
      <h1 class="step-title">Нутритивный анамнез и энергодоступность</h1>
      <p class="step-lead">Как вы питаетесь, как пьёте, какие добавки используете и есть ли риски энергодефицита</p>
    </header>

    <!-- 5.1 ТЕКУЩИЙ РАЦИОН -->
    <section class="form-section">
      <h2 class="form-section-title">1 Текущий рацион</h2>

      <div class="field">
        <label for="dietType">Тип питания <span class="req">*</span></label>
        <select id="dietType" class="input">${optionsHtml(DIET_OPTIONS, a.dietType)}</select>
      </div>

      <!-- Раскрывается при выборе «Другое». -->
      <div class="field" id="dietTypeOther-wrap"
        style="display:${a.dietType === 'other' ? 'block' : 'none'}">
        <label for="dietTypeOther">Уточните</label>
        <textarea id="dietTypeOther" class="textarea" rows="2"
          placeholder="Опишите тип питания"
        >${esc(a.dietTypeOther)}</textarea>
      </div>

      <div class="disease-group">
        ${gatedHtml(a, 'hasDietRestrictions', 'Религиозные или культурные ограничения, посты', {
          detailLabel: 'Что именно',
          placeholder: 'Например: халяль, кошер, православные посты'
        })}
      </div>

      <div class="field-row">
        <div class="field">
          <label for="mealsPerDay">Число приёмов пищи в день <span class="req">*</span></label>
          <input id="mealsPerDay" class="input" type="number" min="1" max="10"
            value="${a.mealsPerDay ?? ''}">
        </div>
        <div class="field">
          <label for="dailyCaloriesEstimate">Самооценка калорийности, ккал/сут</label>
          <input id="dailyCaloriesEstimate" class="input" type="number" min="500" max="8000"
            value="${a.dailyCaloriesEstimate ?? ''}">
        </div>
      </div>

      <div class="field">
        <label>Завтракаете каждый день? <span class="req">*</span></label>
        <div class="radio-row">
          <label class="radio">
            <input type="radio" name="hasBreakfast" value="yes"
              ${a.hasBreakfast === 'yes' ? 'checked' : ''}>
            Да
          </label>
          <label class="radio">
            <input type="radio" name="hasBreakfast" value="no"
              ${a.hasBreakfast === 'no' ? 'checked' : ''}>
            Нет
          </label>
        </div>
      </div>

      <!-- Раскрывается при «Нет» — уточнение периодичности. -->
      <div class="field" id="breakfastFrequency-wrap"
        style="display:${a.hasBreakfast === 'no' ? 'block' : 'none'}">
        <label for="breakfastFrequency">С какой периодичностью завтракаете?</label>
        <textarea id="breakfastFrequency" class="textarea" rows="2"
          placeholder="Например: 3–4 раза в неделю, только в выходные, через день"
        >${esc(a.breakfastFrequency)}</textarea>
      </div>

      <div class="disease-group">
        ${gatedHtml(a, 'hasMacroTargets', 'Целевые БЖУ или калорийность от диетолога', {
          detailLabel: 'Что именно',
          placeholder: 'Например: 2800 ккал, 150 г белка, 350 г углеводов, 90 г жира'
        })}
      </div>
    </section>

    <!-- 5.2 ГИДРАТАЦИЯ И ЭЛЕКТРОЛИТЫ -->
    <section class="form-section">
      <h2 class="form-section-title">2 Гидратация и электролиты</h2>

      <div class="field-row">
        <div class="field">
          <label for="hydrationNormalLiters">Потребление жидкости в день, л</label>
          <input id="hydrationNormalLiters" class="input" type="number" min="0" max="15" step="0.1"
            value="${a.hydrationNormalLiters ?? ''}">
        </div>
        <div class="field">
          <label for="hydrationHardLiters">Потребление жидкости в дни тренировок, л</label>
          <input id="hydrationHardLiters" class="input" type="number" min="0" max="15" step="0.1"
            value="${a.hydrationHardLiters ?? ''}">
        </div>
      </div>

      <div class="field">
        <label for="sweatLevel">Уровень потоотделения</label>
        <select id="sweatLevel" class="input">${optionsHtml(SWEAT_OPTIONS, a.sweatLevel)}</select>
        <div class="field-help">Субъективно. Сильное — одежда после тренировки промокает, видны солевые разводы</div>
      </div>

      <div class="disease-group">
        ${gatedHtml(a, 'usesElectrolytes', 'Используете изотоники, соли, электролиты?', {
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'Что именно, дозы',
          placeholder: 'Название, состав, дозировка, частота',
          required: true
        })}
        ${gatedHtml(a, 'hasWeightLossTracking', 'Измеряете потерю массы за тренировку?', {
          detailLabel: 'Сколько кг в среднем и в каких условиях',
          placeholder: 'Например: 0,8 кг за полуторачасовую тренировку в жару',
          required: true
        })}
      </div>
    </section>

    <!-- 5.3 ЭНЕРГОДОСТУПНОСТЬ -->
    <section class="form-section">
      <h2 class="form-section-title">3 Энергодоступность и риски энергодефицита</h2>

      <div class="disease-group">
        ${gatedHtml(a, 'hasCalorieRestriction', 'Сознательное ограничение калорий', {
          detailLabel: 'Когда и как',
          placeholder: 'Постоянное ограничение, целевые цифры дефицита',
          required: true
        })}
        ${gatedHtml(a, 'hasDryingPeriods', 'Сезонные «сушки»', {
          detailLabel: 'Когда и как',
          placeholder: 'Перед стартами, циклически, длительность',
          required: true
        })}
        ${gatedHtml(a, 'hasWeightSwings', 'Скачки массы между сезонами', {
          detailLabel: 'Диапазон колебаний',
          placeholder: 'Например: ±5–7 кг между сезоном и межсезоньем',
          required: true
        })}
        ${gatedHtml(a, 'hasFuelLowFeelings', 'Ощущение нехватки энергии на тренировке', {
          detailLabel: 'Когда возникает',
          placeholder: 'На каких тренировках, в какое время — например, во второй половине длинных тренировок',
          required: true
        })}
        ${gatedHtml(a, 'hasDizziness', 'Головокружения', {
          detailLabel: 'Когда и при каких обстоятельствах',
          placeholder: 'На тренировке, после еды, при низкой глюкозе и т.п.',
          required: true
        })}
        ${!isAmateur ? gatedHtml(a, 'hasScreeningQuestionnaires', 'Заполняли LEAF-Q или LEAM-Q?', {
          abbrFull: 'опросники-скрининги низкой энергодоступности — для женщин (LEAF-Q) и мужчин (LEAM-Q)',
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'Балл и интерпретация',
          placeholder: 'Если знаете результат — укажите',
          required: true
        }) : ''}
      </div>
    </section>

    <!-- 5.4 ИСТОЧНИК БАДОВ И WADA-СЕРТИФИКАЦИЯ -->
    <section class="form-section">
      <h2 class="form-section-title">4 Источник БАДов и сертификация</h2>

      <div class="field">
        <label for="supplementSource">Где приобретаете БАДы и спортпит</label>
        <select id="supplementSource" class="input">${optionsHtml(SUPPLEMENT_SOURCE_OPTIONS, a.supplementSource)}</select>
      </div>

      <div class="disease-group">
        ${gatedHtml(a, 'hasBatchCerts', 'Есть ли batch-сертификаты на ваши ключевые продукты?', {
          abbrFull: 'Informed Sport, NSF Certified for Sport, Cologne List',
          yesLabel: 'Да', noLabel: 'Нет / не знаю',
          detailLabel: 'У каких продуктов',
          placeholder: 'Какие продукты с сертификатом и какие — без'
        })}
      </div>
    </section>

    <nav class="step-nav">
      <button class="btn-ghost" id="back-btn" type="button">Назад</button>
      <button class="btn-primary" id="next-btn" type="button">Сохранить и продолжить</button>
    </nav>
  `;

  // ---------- Гейты ----------
  const gates = [
    'hasDietRestrictions', 'hasMacroTargets',
    'usesElectrolytes', 'hasWeightLossTracking',
    'hasCalorieRestriction', 'hasDryingPeriods', 'hasWeightSwings',
    'hasFuelLowFeelings', 'hasDizziness',
    'hasBatchCerts'
  ];
  if (!isAmateur) gates.push('hasScreeningQuestionnaires');
  gates.forEach(key => bindGated(container, key));

  // ---------- Радиогруппа «Завтракаете каждый день?» ----------
  // При «Нет» раскрываем поле уточнения периодичности, при «Да» — прячем
  // и чистим значение (чтобы в JSON не висел старый текст).
  const breakfastWrap = container.querySelector('#breakfastFrequency-wrap');
  container.querySelectorAll('input[name="hasBreakfast"]').forEach(r => {
    r.addEventListener('change', () => {
      setAnswer(BLOCK_ID, 'hasBreakfast', r.value);
      const show = r.value === 'no';
      breakfastWrap.style.display = show ? 'block' : 'none';
      if (!show) {
        const ta = container.querySelector('#breakfastFrequency');
        if (ta && ta.value) {
          ta.value = '';
          setAnswer(BLOCK_ID, 'breakfastFrequency', '');
        }
      }
    });
  });

  // ---------- Селект «Тип питания» → раскрытие при «Другое» ----------
  const dietTypeEl = container.querySelector('#dietType');
  const dietOtherWrap = container.querySelector('#dietTypeOther-wrap');
  dietTypeEl.addEventListener('change', () => {
    const show = dietTypeEl.value === 'other';
    dietOtherWrap.style.display = show ? 'block' : 'none';
    if (!show) {
      const ta = container.querySelector('#dietTypeOther');
      if (ta && ta.value) {
        ta.value = '';
        setAnswer(BLOCK_ID, 'dietTypeOther', '');
      }
    }
  });

  // ---------- Autosave ----------
  const stringFields = [
    'dietType', 'dietTypeOther',
    // dietRestrictions переехал в гейт hasDietRestrictions (detail хранится
    // в hasDietRestrictionsDetail и автосейвится через gates.map выше).
    'breakfastFrequency',
    'sweatLevel', 'supplementSource',
    ...gates.map(k => k + 'Detail')
  ];
  const numberFields = [
    'mealsPerDay', 'dailyCaloriesEstimate',
    'hydrationNormalLiters', 'hydrationHardLiters'
  ];
  const num = v => (v === '' ? null : Number(v));
  stringFields.forEach(id => bindField(container, id));
  numberFields.forEach(id => bindField(container, id, num));

  // ---------- Навигация ----------
  container.querySelector('#back-btn').addEventListener('click', onBack);
  container.querySelector('#next-btn').addEventListener('click', () => {
    profile.blocks[BLOCK_ID].status = 'done';
    onNext();
  });
}

/* ---------------------------------------------------------------------------
   Хелперы (дубль с medical.js / endocrine.js — позже вынесем в общий модуль).
   --------------------------------------------------------------------------- */

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
          placeholder="${esc(opts.placeholder || '')}"
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

function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
