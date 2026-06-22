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
import { sendToDoctor } from './report.js';

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

// ----- Финальный экран: одна кнопка «Отправить врачу» ---------------------
// Все файлы (HTML-отчёт, JSON-профиль, прикреплённые PDF) собираются
// автоматически в письме — клиенту никакие отдельные скачивания не нужны.
function renderDone() {
  root.innerHTML = `
    <div class="done-screen">
      <h1>Анкета заполнена</h1>
      <p>Нажмите кнопку ниже, чтобы отправить анамнез врачу</p>

      <div class="done-actions">
        <button class="btn-primary" id="send-doctor-btn" type="button">Отправить врачу</button>
      </div>

      <div id="send-status" class="send-status" hidden></div>
    </div>
  `;

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
}

loadProfile();
render();
