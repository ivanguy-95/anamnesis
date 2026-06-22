/* ---------------------------------------------------------------------------
   blocks/sleep.js
   ---------------
   БЛОК 6. «Сон, восстановление, психоэмоциональный статус».
   Четыре секции по PDF-опроснику:
     6.1 Сон                       (длительность, время, качество, бессонница, мелатонин, апноэ)
     6.2 Психоэмоциональный фон    (тревожность, депрессия, психолог, препараты)
     6.3 Перетренированность       (HRV, пульс, шкалы восстановления, ранние симптомы)
     6.4 Образ жизни               (курение, алкоголь, кофеин, рекреационные — WADA-критично)

   Все поля автосохраняются. Гейты — gatedHtml/bindGated, простые радио —
   simpleRadioHtml/bindSimpleRadio.
   --------------------------------------------------------------------------- */

import { getProfile, setAnswer } from '../state.js';

const BLOCK_ID = 'sleep';

export function render(container, { onBack, onNext }) {
  const profile = getProfile();
  const a = profile.blocks[BLOCK_ID].answers;
  const isAmateur = profile.meta.level === 'amateur';

  container.innerHTML = `
    <header class="step-header">
      <div class="step-eyebrow">Блок 6</div>
      <h1 class="step-title">Сон, восстановление, психоэмоциональный статус</h1>
      <p class="step-lead">Сон, психоэмоциональное состояние, признаки перетренированности и привычки. Эти данные помогают оценить восстановление и подобрать поддерживающие протоколы</p>
    </header>

    <!-- 6.1 СОН -->
    <section class="form-section">
      <h2 class="form-section-title">6.1 Сон</h2>

      <div class="field-row">
        <div class="field">
          <label for="sleepDurationNormal">Длительность сна до тренировки, ч</label>
          <input id="sleepDurationNormal" class="input" type="number"
            min="0" max="14" step="0.5" value="${a.sleepDurationNormal ?? ''}">
        </div>
        <div class="field">
          <label for="sleepDurationBeforeHard">Длительность сна после тренировки, ч</label>
          <input id="sleepDurationBeforeHard" class="input" type="number"
            min="0" max="14" step="0.5" value="${a.sleepDurationBeforeHard ?? ''}">
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="bedtime">Время отхода ко сну</label>
          <input id="bedtime" class="input" type="time" value="${esc(a.bedtime)}">
        </div>
        <div class="field">
          <label for="wakeupTime">Время пробуждения</label>
          <input id="wakeupTime" class="input" type="time" value="${esc(a.wakeupTime)}">
        </div>
      </div>

      <div class="field">
        <label for="sleepQuality">Качество сна по субъективной шкале 1–10</label>
        <input id="sleepQuality" class="input" type="number"
          min="1" max="10" step="1" value="${a.sleepQuality ?? ''}">
      </div>

      <div class="disease-group">
        ${gatedHtml(a, 'hasInsomnia', 'Эпизоды бессонницы', {
          detailLabel: 'Частота и причины',
          placeholder: 'Например: 2–3 раза в неделю; стресс / перелёты / препараты'
        })}
        ${gatedHtml(a, 'usesMelatonin', 'Принимаете мелатонин?', {
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'Дозировка и частота',
          placeholder: 'Например: 3 мг за 30 мин до сна, 2–3 раза в неделю'
        })}
        ${gatedHtml(a, 'hasSleepApnea', 'Жалобы на ночное апноэ', {
          abbrFull: 'остановки дыхания во сне',
          detailLabel: 'Какие жалобы',
          placeholder: 'Храп, остановки дыхания, дневная сонливость'
        })}
      </div>
    </section>

    <!-- 6.2 ПСИХОЭМОЦИОНАЛЬНЫЙ ФОН -->
    <section class="form-section">
      <h2 class="form-section-title">6.2 Психоэмоциональный фон</h2>

      <div class="field">
        <label for="preRaceAnxiety">Уровень тревожности перед стартами по шкале 1–10</label>
        <input id="preRaceAnxiety" class="input" type="number"
          min="1" max="10" step="1" value="${a.preRaceAnxiety ?? ''}">
      </div>

      <div class="disease-group">
        ${gatedHtml(a, 'hadDepression', 'Эпизоды депрессии', {
          yesLabel: 'Было', noLabel: 'Не было',
          detailLabel: 'Когда и как долго',
          placeholder: 'Период, обстоятельства, обращались ли к специалисту'
        })}
        ${gatedHtml(a, 'hadBurnout', 'Эпизоды выгорания', {
          yesLabel: 'Было', noLabel: 'Не было',
          detailLabel: 'Когда и как долго',
          placeholder: 'Период, обстоятельства'
        })}
        ${gatedHtml(a, 'worksWithPsychologist', 'Работаете с психологом / спортивным психологом?', {
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'С каким специалистом и как часто',
          placeholder: 'Например: со спортивным психологом 1 раз в 2 недели'
        })}
        ${gatedHtml(a, 'takesAntidepressants', 'Принимаете антидепрессанты или анксиолитики?', {
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'Препараты и дозы',
          placeholder: 'Название, дозировка, длительность приёма'
        })}
      </div>
    </section>

    ${isAmateur ? '' : `
      <!-- 6.3 ПЕРЕТРЕНИРОВАННОСТЬ И ВОССТАНОВЛЕНИЕ
           FILTER (level=elite | pro): любителям этот блок не показываем —
           HRV, шкалы Hooper/Borg/RPE и системный трекинг утреннего пульса
           актуальны при структурированной подготовке. -->
      <section class="form-section">
        <h2 class="form-section-title">6.3 Перетренированность и восстановление</h2>

        <div class="disease-group">
          ${gatedHtml(a, 'tracksHrv', 'Измеряете HRV?', {
            abbrFull: 'вариабельность сердечного ритма — маркер восстановления',
            yesLabel: 'Да', noLabel: 'Нет',
            detailLabel: 'Устройство и тренды за 30 дней',
            placeholder: 'Например: часы Garmin / Whoop; средний RMSSD, динамика'
          })}
          ${gatedHtml(a, 'tracksMorningPulse', 'Отслеживаете утренний пульс натощак?', {
            yesLabel: 'Да', noLabel: 'Нет',
            detailLabel: 'Динамика',
            placeholder: 'Обычные значения и недавние отклонения'
          })}
          ${gatedHtml(a, 'tracksRecoveryScale', 'Регулярно фиксируете шкалу восстановления (Hooper / Borg / RPE)?', {
            abbrFull: 'субъективные шкалы оценки восстановления и нагрузки',
            yesLabel: 'Да', noLabel: 'Нет',
            detailLabel: 'Какую шкалу и как часто',
            placeholder: 'Например: Hooper после каждой тренировки, RPE после тяжёлых сессий'
          })}

          ${simpleRadioHtml(a, 'hasMotivationLoss',    'Упало желание тренироваться?',                                'Есть', 'Нет')}
          ${simpleRadioHtml(a, 'hasPerformanceDecline', 'Снижение работоспособности на тех же нагрузках за 4–8 недель?', 'Есть', 'Нет')}
          ${simpleRadioHtml(a, 'hasFrequentInfections', 'Частые простуды (≥3 ОРВИ за последние 6 мес)?',               'Есть', 'Нет')}
        </div>
      </section>
    `}

    <!-- 6.4 ОБРАЗ ЖИЗНИ -->
    <section class="form-section">
      <h2 class="form-section-title">6.4 Образ жизни</h2>

      <div class="disease-group">
        ${gatedHtml(a, 'smokes', 'Курите', {
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'Что и как часто',
          placeholder: 'Например: сигареты — 5 шт/день; вейп ежедневно; кальян 1–2 раза в месяц'
        })}

        <!-- Алкоголь: при «Да» раскрывается detail + вложенный вопрос
             «Были запойные эпизоды?». При «Нет» — оба прячутся и чистятся. -->
        <div class="gated-item">
          <div class="gated-row">
            <label>Употребляете алкоголь</label>
            <div class="radio-row">
              <label class="radio">
                <input type="radio" name="drinksAlcohol" value="yes"
                  ${a.drinksAlcohol === 'yes' ? 'checked' : ''}>
                Да
              </label>
              <label class="radio">
                <input type="radio" name="drinksAlcohol" value="no"
                  ${a.drinksAlcohol === 'no' ? 'checked' : ''}>
                Нет
              </label>
            </div>
          </div>
          <div class="gated-detail" id="drinksAlcoholDetail-wrap"
            style="display:${a.drinksAlcohol === 'yes' ? 'block' : 'none'}">
            <label for="drinksAlcoholDetail">Частота и средние дозы</label>
            <textarea id="drinksAlcoholDetail" class="textarea" rows="3"
              placeholder="Например: бокал вина 1–2 раза в неделю"
            >${esc(a.drinksAlcoholDetail)}</textarea>

            <div style="margin-top:12px">
              ${gatedHtml(a, 'hadBingeDrinking', 'Были запойные эпизоды?', {
                yesLabel: 'Да', noLabel: 'Нет',
                detailLabel: 'Когда и в каких обстоятельствах'
              })}
            </div>
          </div>
        </div>

        ${gatedHtml(a, 'usesCaffeine', 'Потребляете кофеин', {
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'Суточная доза и источники',
          placeholder: 'Например: 2 чашки кофе + предтренировочный комплекс — около 300 мг/сут'
        })}
        ${gatedHtml(a, 'usesRecreationalSubstances', 'Употребляете рекреационные вещества', {
          abbrFull: 'каннабиноиды, кокаин, амфетамины — запрещены WADA in-competition',
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'Что и как часто',
          placeholder: 'Что именно и периодичность. Важно для WADA-комплаенса'
        })}
      </div>
    </section>

    <nav class="step-nav">
      <button class="btn-ghost" id="back-btn" type="button">Назад</button>
      <button class="btn-primary" id="next-btn" type="button">Сохранить и продолжить</button>
    </nav>
  `;

  // ---------- Гейты ----------
  // drinksAlcohol биндим вручную (ниже) — у него вложенный вопрос про запои.
  const gates = [
    // 6.1
    'hasInsomnia', 'usesMelatonin', 'hasSleepApnea',
    // 6.2
    'hadDepression', 'hadBurnout', 'worksWithPsychologist', 'takesAntidepressants',
    // 6.4 (без drinksAlcohol — у него кастомный обработчик)
    'smokes', 'hadBingeDrinking', 'usesCaffeine', 'usesRecreationalSubstances'
  ];
  // 6.3 — только для элиты/профи.
  if (!isAmateur) {
    gates.push('tracksHrv', 'tracksMorningPulse', 'tracksRecoveryScale');
  }
  gates.forEach(key => bindGated(container, key));

  // ---------- Простые радио 6.3 — только для элиты/профи ----------
  if (!isAmateur) {
    ['hasMotivationLoss', 'hasPerformanceDecline', 'hasFrequentInfections']
      .forEach(key => bindSimpleRadio(container, key));
  }

  // ---------- Кастомный обработчик «Употребляете алкоголь» ----------
  // При «Нет» прячем и обнуляем не только detail-текст, но и вложенный
  // вопрос «Были запойные эпизоды?» — иначе в JSON остаётся устаревший ответ.
  const alcoholWrap = container.querySelector('#drinksAlcoholDetail-wrap');
  container.querySelectorAll('input[name="drinksAlcohol"]').forEach(r => {
    r.addEventListener('change', () => {
      setAnswer(BLOCK_ID, 'drinksAlcohol', r.value);
      const show = r.value === 'yes';
      alcoholWrap.style.display = show ? 'block' : 'none';
      if (!show) {
        // Чистим detail алкоголя
        const ta = container.querySelector('#drinksAlcoholDetail');
        if (ta && ta.value) {
          ta.value = '';
          setAnswer(BLOCK_ID, 'drinksAlcoholDetail', '');
        }
        // Чистим вложенный вопрос про запои и его detail
        ['hadBingeDrinking', 'hadBingeDrinkingDetail'].forEach(k => setAnswer(BLOCK_ID, k, ''));
        container.querySelectorAll('input[name="hadBingeDrinking"]').forEach(rb => rb.checked = false);
        const bingeWrap = container.querySelector('#hadBingeDrinkingDetail-wrap');
        if (bingeWrap) bingeWrap.style.display = 'none';
        const bingeTa = container.querySelector('#hadBingeDrinkingDetail');
        if (bingeTa) bingeTa.value = '';
      }
    });
  });

  // ---------- Autosave ----------
  const stringFields = [
    'bedtime', 'wakeupTime',
    'drinksAlcoholDetail', // у drinksAlcohol свой обработчик, но detail нужно автосейвить
    ...gates.map(k => k + 'Detail')
  ];
  const numberFields = [
    'sleepDurationNormal', 'sleepDurationBeforeHard', 'sleepQuality',
    'preRaceAnxiety'
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
   Хелперы (дубль — позже вынесем в общий модуль).
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

function simpleRadioHtml(a, key, label, yesLabel = 'Да', noLabel = 'Нет') {
  return `
    <div class="gated-item">
      <div class="gated-row">
        <label>${esc(label)}</label>
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
