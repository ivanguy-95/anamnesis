/* ---------------------------------------------------------------------------
   help.js
   -------
   Опция «?» для специфических вопросов-гейтов. Рядом с вопросом — кружок «?»,
   по клику раскрывается поповер с кратким обоснованием, цветной подсказкой и
   кнопкой «Не проверял». После нажатия:
     • гейту проставляется значение 'not_checked' (через скрытый radio той же
       группы → срабатывает обычный autosave/bindGated блока);
     • строка сереет (класс .gated-item--notchecked);
     • в итоговом отчёте значение выводится как «не проверялся».

   Если позже выбрать «Есть/Нет» — серость снимается, значение перезаписывается.

   Подключение: после рендера блока — initHelp(container). Разметку «?» +
   поповер + скрытый radio добавляет gatedHtml при наличии opts.help.
   --------------------------------------------------------------------------- */

export function initHelp(container) {
  container.querySelectorAll('.help-icon').forEach(icon => {
    if (icon.__helpBound) return;
    icon.__helpBound = true;

    const item = icon.closest('.gated-item');
    if (!item) return;
    const pop = item.querySelector('.help-pop');
    const ncRadio = item.querySelector('input.nc-radio');
    const btn = pop && pop.querySelector('.help-pop-btn');
    const badge = item.querySelector('.nc-badge');
    const visibleRadios = item.querySelectorAll('.radio-row input[type="radio"]');

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
    if (btn && ncRadio) {
      btn.addEventListener('click', () => {
        ncRadio.checked = true;
        ncRadio.dispatchEvent(new Event('change', { bubbles: true }));
        item.classList.add('gated-item--notchecked');
        if (pop) pop.setAttribute('hidden', '');
        icon.setAttribute('aria-expanded', 'false');
      });
    }

    // Клик по бейджу «не проверялся» возвращает тумблер для выбора ответа.
    if (badge) {
      badge.addEventListener('click', () => item.classList.remove('gated-item--notchecked'));
    }

    // Выбор «Есть/Нет» окончательно снимает состояние «не проверял».
    visibleRadios.forEach(r =>
      r.addEventListener('change', () => item.classList.remove('gated-item--notchecked'))
    );
  });
}
