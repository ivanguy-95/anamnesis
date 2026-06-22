/* ---------------------------------------------------------------------------
   blocks/family.js
   ----------------
   БЛОК 7. «Семейный и генетический анамнез».
   Три секции по PDF-опроснику:
     7.1 Заболевания у родственников 1-й линии (ССЗ, инсульты, диабет, онкология)
     7.2 Наследственные риски                 (тромбофилии, гемохроматоз, гомоцистеинемия)
     7.3 Генетическое тестирование            (ACTN3, ACE, MTHFR, COMT, VDR, CYP)

   Без жёстких фильтров по уровню — семейный анамнез одинаково важен и
   для элиты, и для любителей. Гемохроматоз и тромбофилии — критичные
   для назначения железа, контрацептивов и протоколов перелётов.
   --------------------------------------------------------------------------- */

import { getProfile, setAnswer } from '../state.js';

const PDF_MAX_BYTES = 4 * 1024 * 1024;

const BLOCK_ID = 'family';

export function render(container, { onBack, onNext }) {
  const profile = getProfile();
  const a = profile.blocks[BLOCK_ID].answers;

  container.innerHTML = `
    <header class="step-header">
      <div class="step-eyebrow">Блок 7</div>
      <h1 class="step-title">Семейный и генетический анамнез</h1>
      <p class="step-lead">Болезни у близких родственников (родители, братья и сёстры, дети) и наследственные особенности — фон для оценки рисков и подбора препаратов.</p>
    </header>

    <!-- 7.1 ЗАБОЛЕВАНИЯ У РОДСТВЕННИКОВ 1-Й ЛИНИИ -->
    <section class="form-section">
      <h2 class="form-section-title">7.1 Заболевания у родственников 1-й линии</h2>
      <div class="disease-group">
        ${gatedHtml(a, 'familyCvd', 'Сердечно-сосудистые заболевания', {
          abbrFull: 'инфаркт, тяжёлая ИБС — особенно важны случаи у мужчин до 55 лет и у женщин до 65',
          detailLabel: 'Кто и в каком возрасте'
        })}
        ${gatedHtml(a, 'familySuddenDeath', 'Внезапная сердечная смерть', {
          detailLabel: 'Кто и в каком возрасте'
        })}
        ${gatedHtml(a, 'familyStroke', 'Инсульты', {
          detailLabel: 'Кто и в каком возрасте'
        })}
        ${gatedHtml(a, 'familyDiabetes', 'Сахарный диабет', {
          detailLabel: 'Кто и тип (1 / 2)'
        })}
        ${gatedHtml(a, 'familyCancer', 'Онкология', {
          detailLabel: 'Кто и какой вид'
        })}
      </div>
    </section>

    <!-- 7.2 НАСЛЕДСТВЕННЫЕ РИСКИ -->
    <section class="form-section">
      <h2 class="form-section-title">7.2 Наследственные риски</h2>
      <div class="disease-group">
        ${gatedHtml(a, 'familyThrombophilia', 'Тромбофилии', {
          abbrFull: 'фактор V Лейден, мутация протромбина G20210A, MTHFR — повышенный риск тромбозов',
          detailLabel: 'У кого, какая мутация',
          placeholder: 'Например: Лейден гетерозиготная у матери'
        })}
        ${gatedHtml(a, 'familyHemochromatosis', 'Гемохроматоз', {
          abbrFull: 'наследственный избыток железа — критично перед назначением препаратов железа',
          detailLabel: 'У кого, тип'
        })}
        ${gatedHtml(a, 'familyHyperhomocysteinemia', 'Гомоцистеинемия', {
          abbrFull: 'повышенный гомоцистеин — основание для метилированных форм фолата / B12 / B6',
          detailLabel: 'У кого и значения, если известны'
        })}
      </div>
    </section>

    <!-- 7.3 ГЕНЕТИЧЕСКОЕ ТЕСТИРОВАНИЕ -->
    <!-- Кастомная разметка вместо gatedHtml: в раскрытии нужны textarea
         с расшифровкой + поле прикрепления PDF результата. -->
    <section class="form-section">
      <h2 class="form-section-title">7.3 Генетическое тестирование</h2>
      <div class="disease-group">
        <div class="gated-item">
          <div class="gated-row">
            <label>Делали генетический тест?</label>
            <div class="radio-row">
              <label class="radio">
                <input type="radio" name="hasGeneticTest" value="yes"
                  ${a.hasGeneticTest === 'yes' ? 'checked' : ''}>
                Да
              </label>
              <label class="radio">
                <input type="radio" name="hasGeneticTest" value="no"
                  ${a.hasGeneticTest === 'no' ? 'checked' : ''}>
                Нет
              </label>
            </div>
          </div>
          <div class="gated-detail" id="hasGeneticTestDetail-wrap"
            style="display:${a.hasGeneticTest === 'yes' ? 'block' : 'none'}">
            <label for="hasGeneticTestDetail">Какие полиморфизмы и результат</label>
            <textarea id="hasGeneticTestDetail" class="textarea" rows="3"
              placeholder="Например: ACTN3 (R/X), ACE (I/D), MTHFR C677T, COMT, VDR, CYP — какие варианты"
            >${esc(a.hasGeneticTestDetail)}</textarea>

            <div class="field" style="margin-top:12px">
              <label for="geneticTestPdfInput">Прикрепить результаты теста (PDF)</label>
              <input id="geneticTestPdfInput" class="file-input" type="file" accept="application/pdf,.pdf">
              <div id="geneticTestPdfStatus" class="file-status"></div>
              <div class="field-help">Максимум 4 МБ. Сохраняется вместе с анкетой в браузере.</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <nav class="step-nav">
      <button class="btn-ghost" id="back-btn" type="button">← Назад</button>
      <button class="btn-primary" id="next-btn" type="button">Сохранить и продолжить</button>
    </nav>
  `;

  // ---------- Гейты ----------
  // hasGeneticTest биндим вручную (ниже) — нужно чистить и PDF при «Нет».
  const gates = [
    // 7.1
    'familyCvd', 'familySuddenDeath', 'familyStroke', 'familyDiabetes', 'familyCancer',
    // 7.2
    'familyThrombophilia', 'familyHemochromatosis', 'familyHyperhomocysteinemia'
  ];
  gates.forEach(key => bindGated(container, key));

  // ---------- 7.3 «Делали генетический тест?» с PDF-прикреплением ----------
  const testWrap = container.querySelector('#hasGeneticTestDetail-wrap');
  container.querySelectorAll('input[name="hasGeneticTest"]').forEach(r => {
    r.addEventListener('change', () => {
      setAnswer(BLOCK_ID, 'hasGeneticTest', r.value);
      const show = r.value === 'yes';
      testWrap.style.display = show ? 'block' : 'none';
      if (!show) {
        // Чистим textarea и PDF — иначе в JSON останется устаревший результат.
        const ta = container.querySelector('#hasGeneticTestDetail');
        if (ta && ta.value) {
          ta.value = '';
          setAnswer(BLOCK_ID, 'hasGeneticTestDetail', '');
        }
        if (getProfile().blocks[BLOCK_ID].answers.geneticTestPdf) {
          setAnswer(BLOCK_ID, 'geneticTestPdf', null);
          renderPdfStatus(container);
        }
      }
    });
  });
  bindPdfInput(container);

  // ---------- Autosave (detail-поля) ----------
  const stringFields = [
    ...gates.map(k => k + 'Detail'),
    'hasGeneticTestDetail'
  ];
  stringFields.forEach(id => bindField(container, id));

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

/* ---------------------------------------------------------------------------
   Загрузка PDF с результатом генетического теста (7.3).
   Хранение: base64 в state.answers.geneticTestPdf = { name, size, dataUrl }.
   Лимит 4 МБ — защита от переполнения квоты localStorage.
   --------------------------------------------------------------------------- */

function bindPdfInput(container) {
  const input = container.querySelector('#geneticTestPdfInput');
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > PDF_MAX_BYTES) {
      alert('Файл слишком большой (>4 МБ). Сожмите PDF или прикрепите другой.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAnswer(BLOCK_ID, 'geneticTestPdf', {
        name: file.name,
        size: file.size,
        dataUrl: reader.result
      });
      renderPdfStatus(container);
      input.value = ''; // позволить повторно выбрать тот же файл
    };
    reader.onerror = () => alert('Не удалось прочитать файл.');
    reader.readAsDataURL(file);
  });
  renderPdfStatus(container); // показать уже прикреплённый при загрузке страницы
}

function renderPdfStatus(container) {
  const status = container.querySelector('#geneticTestPdfStatus');
  if (!status) return;
  const pdf = getProfile().blocks[BLOCK_ID].answers.geneticTestPdf;
  if (pdf && pdf.name) {
    const kb = pdf.size / 1024;
    const sizeStr = kb >= 1024 ? (kb / 1024).toFixed(1) + ' МБ' : Math.round(kb) + ' КБ';
    status.innerHTML = `
      <span class="file-attached">
        <span class="file-name">📎 ${esc(pdf.name)}</span>
        <span class="file-size">${sizeStr}</span>
        <button type="button" class="file-remove" id="geneticTestPdfRemove" aria-label="Удалить файл">×</button>
      </span>
    `;
    container.querySelector('#geneticTestPdfRemove').addEventListener('click', () => {
      setAnswer(BLOCK_ID, 'geneticTestPdf', null);
      renderPdfStatus(container);
    });
  } else {
    status.innerHTML = '<span class="file-empty">Файл не выбран</span>';
  }
}
