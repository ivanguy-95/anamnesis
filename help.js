/* ---------------------------------------------------------------------------
   help.js
   -------
   Опция «?» для специфических вопросов-гейтов. Рядом с вопросом — кружок «?»,
   по клику раскрывается поповер с кратким обоснованием.

   • Обычное состояние: в поповере кнопка «Не проверял». После нажатия гейту
     проставляется 'not_checked' (через скрытый radio той же группы →
     срабатывает обычный autosave/bindGated блока), тумблер заменяется бейджем
     «не проверялся», а в отчёте значение выводится как «не проверялся».
   • Состояние «не проверялся»: в поповере вместо «Не проверял» — синяя кнопка
     «Вернуть». Она очищает значение и возвращает тумблер для выбора ответа.

   Выбор «Есть/Нет» тоже снимает состояние «не проверялся».

   Подключение: после рендера блока — initHelp(container). Разметку добавляет
   gatedHtml при наличии opts.help.
   --------------------------------------------------------------------------- */

import { getProfile, saveProfile } from './state.js';

export function initHelp(container) {
  container.querySelectorAll('.help-icon').forEach(icon => {
    if (icon.__helpBound) return;
    icon.__helpBound = true;

    const item = icon.closest('.gated-item');
    if (!item) return;
    const pop = item.querySelector('.help-pop');
    const ncRadio = item.querySelector('input.nc-radio');
    const markBtn = pop && pop.querySelector('.help-pop-btn');       // «Не проверял»
    const returnBtn = pop && pop.querySelector('.help-pop-return');  // «Вернуть»
    const badge = item.querySelector('.nc-badge');
    const visibleRadios = item.querySelectorAll('.radio-row input[type="radio"]');

    function closePop() {
      if (pop) pop.setAttribute('hidden', '');
      icon.setAttribute('aria-expanded', 'false');
    }

    // Очистить значение гейта и вернуть тумблер.
    function returnGate() {
      if (ncRadio) {
        ncRadio.checked = false;
        const key = ncRadio.name;
        const profile = getProfile();
        for (const block of Object.values(profile.blocks)) {
          if (key in block.answers) { block.answers[key] = ''; break; }
        }
        saveProfile();
      }
      item.classList.remove('gated-item--notchecked');
      closePop();
    }

    // «?» — раскрыть/свернуть поповер (и закрыть остальные).
    icon.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (!pop) return;
      const willOpen = pop.hasAttribute('hidden');
      container.querySelectorAll('.help-pop').forEach(p => p.setAttribute('hidden', ''));
      container.querySelectorAll('.help-icon').forEach(i => i.setAttribute('aria-expanded', 'false'));
      if (willOpen) {
        pop.removeAttribute('hidden');
        icon.setAttribute('aria-expanded', 'true');
      }
    });

    // «Не проверял» — проставить not_checked: тумблер заменяется бейджем.
    if (markBtn && ncRadio) {
      markBtn.addEventListener('click', () => {
        ncRadio.checked = true;
        ncRadio.dispatchEvent(new Event('change', { bubbles: true }));
        item.classList.add('gated-item--notchecked');
        closePop();
      });
    }

    // «Вернуть» — очистить и вернуть тумблер.
    if (returnBtn) returnBtn.addEventListener('click', returnGate);

    // Клик по бейджу «не проверялся» тоже возвращает тумблер.
    if (badge) badge.addEventListener('click', returnGate);

    // Выбор «Есть/Нет» снимает состояние «не проверялся».
    visibleRadios.forEach(r =>
      r.addEventListener('change', () => item.classList.remove('gated-item--notchecked'))
    );
  });
}
