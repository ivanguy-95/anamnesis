/* ---------------------------------------------------------------------------
   blocks/logistics.js
   -------------------
   БЛОК 8. «Контекст подготовки и логистика».
   Три секции по PDF-опроснику:
     8.1 Место постоянного проживания          (город, высота над уровнем моря)
     8.2 Логистика подготовки                  (перелёты, сборы в среднегорье)
     8.3 Доступность и ограничения             (лаборатории, аптеки, бюджет, импорт)

   Без жёстких фильтров по уровню — логистика одинаково важна и для
   профи, и для любителя, готовящегося к личной цели.
   --------------------------------------------------------------------------- */

import { getProfile, setAnswer } from '../state.js';

const BLOCK_ID = 'logistics';

export function render(container, { onBack, onNext }) {
  const profile = getProfile();
  const a = profile.blocks[BLOCK_ID].answers;

  container.innerHTML = `
    <header class="step-header">
      <div class="step-eyebrow">Блок 8</div>
      <h1 class="step-title">Контекст подготовки и логистика</h1>
      <p class="step-lead">Где живёте, перелёты и сборы до старта, доступность лабораторий и препаратов. От этого зависят протоколы десинхроноза, адаптации к высоте и выбор препаратов</p>
    </header>

    <!-- 8.1 МЕСТО ПОСТОЯННОГО ПРОЖИВАНИЯ -->
    <section class="form-section">
      <h2 class="form-section-title">1 Место постоянного проживания</h2>
      <div class="field-row">
        <div class="field">
          <label for="homeCity">Город</label>
          <input id="homeCity" class="input" type="text" value="${esc(a.homeCity)}">
        </div>
        <div class="field">
          <label for="homeAltitude">Высота над уровнем моря, м</label>
          <input id="homeAltitude" class="input" type="number" min="0" max="5000"
            value="${a.homeAltitude ?? ''}">
        </div>
      </div>
    </section>

    <!-- 8.2 ЛОГИСТИКА ПОДГОТОВКИ -->
    <section class="form-section">
      <h2 class="form-section-title">2 Логистика подготовки</h2>
      <div class="disease-group">
        ${gatedHtml(a, 'hasFlightsToStart', 'Запланированы перелёты до старта?', {
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'Количество, длительность, разница часовых поясов',
          placeholder: 'Например: 2 перелёта по 8 часов, +5 часов относительно места тренировок'
        })}
        ${gatedHtml(a, 'hasMountainCamps', 'Запланированы сборы в среднегорье / высокогорье?', {
          yesLabel: 'Да', noLabel: 'Нет',
          detailLabel: 'Локация, высота, длительность, даты, регулярность',
          placeholder: 'Например: Кисловодск (800 м), 3 недели в марте; Терскол (2300 м), 2 недели в апреле'
        })}
      </div>
    </section>

    <!-- 8.3 ДОСТУПНОСТЬ И ОГРАНИЧЕНИЯ -->
    <section class="form-section">
      <h2 class="form-section-title">3 Доступность и ограничения</h2>
      <div class="disease-group">
        ${gatedHtml(a, 'hasAccessIssues', 'Сложности с доступом к лабораториям и аптекам?', {
          detailLabel: 'Что и где',
          placeholder: 'Например: на сборах в горах нет ближайшей лаборатории; редкий препарат недоступен в городе'
        })}
        ${gatedHtml(a, 'hasBudgetLimits', 'Ограничения по бюджету или доступности импортных препаратов?', {
          detailLabel: 'Какие ограничения',
          placeholder: 'Например: импортные препараты через посредников ~3 недели; бюджет до N ₽ в месяц'
        })}
      </div>
    </section>

    <nav class="step-nav">
      <button class="btn-ghost" id="back-btn" type="button">Назад</button>
      <button class="btn-primary" id="next-btn" type="button">Завершить анкету</button>
    </nav>
  `;

  // ---------- Гейты ----------
  const gates = ['hasFlightsToStart', 'hasMountainCamps', 'hasAccessIssues', 'hasBudgetLimits'];
  gates.forEach(key => bindGated(container, key));

  // ---------- Autosave ----------
  const stringFields = ['homeCity', ...gates.map(k => k + 'Detail')];
  const numberFields = ['homeAltitude'];
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
