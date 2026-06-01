/* ---------------------------------------------------------------------------
   app.js
   ------
   Точка входа приложения. Отвечает за:
     1) подъём состояния из localStorage,
     2) рендер текущего экрана в #app,
     3) переходы между экранами (preamble → identity → … далее блоки).

   Доменная логика каждого экрана — в соответствующем модуле в blocks/.
   --------------------------------------------------------------------------- */

import { loadProfile, getProfile } from './state.js';
import * as preamble  from './blocks/preamble.js';
import * as identity  from './blocks/identity.js';
import * as eventStep from './blocks/event.js';
import * as medical   from './blocks/medical.js';
import * as endocrine from './blocks/endocrine.js';
import * as nutrition from './blocks/nutrition.js';
import * as sleep     from './blocks/sleep.js';
import * as family    from './blocks/family.js';
import * as logistics from './blocks/logistics.js';
import { openReport, downloadJson, listAttachedPdfs, downloadAttachedPdf, sendToDoctor } from './report.js';

const root = document.getElementById('app');

// Состояние навигации.
let step = 'level';
// 'level' | 'goal' | 'identity' | 'event' | 'medical' | 'endocrine'
//  | 'nutrition' | 'sleep' | 'family' | 'logistics' | 'done'

function go(nextStep) {
  step = nextStep;
  render();
  window.scrollTo(0, 0);
}

function render() {
  if (step === 'level') {
    preamble.renderLevel(root, {
      onNext: () => go('goal')
    });
  } else if (step === 'goal') {
    preamble.renderGoal(root, {
      onBack: () => go('level'),
      onNext: () => go('identity')
    });
  } else if (step === 'identity') {
    identity.render(root, {
      onBack: () => go('goal'),
      onNext: () => go('event')
    });
  } else if (step === 'event') {
    eventStep.render(root, {
      onBack: () => go('identity'),
      onNext: () => go('medical')
    });
  } else if (step === 'medical') {
    medical.render(root, {
      onBack: () => go('event'),
      onNext: () => go('endocrine')
    });
  } else if (step === 'endocrine') {
    endocrine.render(root, {
      onBack: () => go('medical'),
      onNext: () => go('nutrition')
    });
  } else if (step === 'nutrition') {
    nutrition.render(root, {
      onBack: () => go('endocrine'),
      onNext: () => go('sleep')
    });
  } else if (step === 'sleep') {
    sleep.render(root, {
      onBack: () => go('nutrition'),
      // FILTER: Блоки 7 («Семейный и генетический») и 8 («Контекст подготовки
      // и логистика») скрыты для любителей — у них из 6-го блока идём прямо
      // на финальный экран.
      onNext: () => go(getProfile().meta.level === 'amateur' ? 'done' : 'family')
    });
  } else if (step === 'family') {
    family.render(root, {
      onBack: () => go('sleep'),
      onNext: () => go('logistics')
    });
  } else if (step === 'logistics') {
    logistics.render(root, {
      onBack: () => go('family'),
      onNext: () => go('done')
    });
  } else if (step === 'done') {
    renderDone();
  }
}

// ----- Финальный экран: открыть отчёт, скачать JSON и вложения ------------
function renderDone() {
  const pdfs = listAttachedPdfs();
  root.innerHTML = `
    <div class="done-screen">
      <h1>Анкета заполнена</h1>
      <p>Спасибо! Нажмите «Отправить врачу», чтобы автоматически переслать анамнез. Можно также открыть отчёт или скачать файлы.</p>

      <div class="done-actions">
        <button class="btn-primary" id="send-doctor-btn"  type="button">Отправить врачу</button>
        <button class="btn-ghost"   id="open-report-btn"  type="button">Открыть отчёт</button>
        <button class="btn-ghost"   id="download-json-btn" type="button">Скачать JSON</button>
      </div>

      <div id="send-status" class="send-status" hidden></div>

      ${pdfs.length ? `
        <div class="done-attachments">
          <h3>Прикреплённые файлы</h3>
          <ul>
            ${pdfs.map((p, i) => `
              <li>
                <span>${esc(p.label)}</span>
                <button class="btn-link" type="button" data-pdf-idx="${i}">Скачать «${esc(p.pdf.name)}»</button>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <p class="done-hint">Чтобы получить PDF — в открытом отчёте нажмите <b>Cmd + P</b> и выберите «Сохранить как PDF».</p>
    </div>
  `;

  root.querySelector('#open-report-btn').addEventListener('click', openReport);
  root.querySelector('#download-json-btn').addEventListener('click', downloadJson);

  // Кнопка «Отправить врачу» — асинхронно вызывает /api/send и показывает
  // статус отправки прямо под кнопками.
  const sendBtn = root.querySelector('#send-doctor-btn');
  const sendStatus = root.querySelector('#send-status');
  sendBtn.addEventListener('click', async () => {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Отправляем…';
    sendStatus.hidden = true;
    const ok = await sendToDoctor();
    if (ok) {
      sendBtn.textContent = 'Отправлено ✓';
      sendStatus.hidden = false;
      sendStatus.className = 'send-status ok';
      sendStatus.textContent = 'Анамнез отправлен врачу. Можно закрыть страницу.';
    } else {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Попробовать снова';
      sendStatus.hidden = false;
      sendStatus.className = 'send-status err';
      sendStatus.textContent = 'Не удалось отправить. Проверьте подключение к интернету или попробуйте позже.';
    }
  });

  if (pdfs.length) {
    root.querySelectorAll('[data-pdf-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.pdfIdx, 10);
        downloadAttachedPdf(pdfs[idx].pdf);
      });
    });
  }
}

function esc(v) {
  if (v == null) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

loadProfile();
render();
