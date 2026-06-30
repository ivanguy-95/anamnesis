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
    const visibleRadios = item.querySelectorAll('.radio-row input[type="radio"]');
    const toggle = item.querySelector('.radio-row');

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

    // «Не проверял» — проставить not_checked, посереть, свернуть поповер.
    if (btn && ncRadio) {
      btn.addEventListener('click', () => {
        ncRadio.checked = true;
        ncRadio.dispatchEvent(new Event('change', { bubbles: true }));
        item.classList.add('gated-item--notchecked');
        // Сбросить визуал тумблера (ползунок/активная подпись).
        if (toggle && toggle.classList.contains('toggle')) {
          toggle.classList.add('toggle--unset');
          toggle.querySelectorAll('.radio').forEach(s => s.classList.remove('is-active'));
        }
        if (pop) pop.setAttribute('hidden', '');
        icon.setAttribute('aria-expanded', 'false');
      });
    }

    // Выбор «Есть/Нет» снимает состояние «не проверял».
    visibleRadios.forEach(r =>
      r.addEventListener('change', () => item.classList.remove('gated-item--notchecked'))
    );

    // Восстановление сохранённого состояния.
    if (ncRadio && ncRadio.checked) item.classList.add('gated-item--notchecked');
  });
}
