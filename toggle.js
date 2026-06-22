/* ---------------------------------------------------------------------------
   toggle.js
   ---------
   Превращает бинарные группы radio («Да/Нет», «Есть/Нет», «Было/Не было» и т.п.)
   в компактный переключатель-ползунок:
     • клик по стороне — ползунок переезжает туда;
     • можно тащить ползунок пальцем/мышью, при отпускании он примагничивается
       к ближайшей стороне.

   Это прогрессивное улучшение: исходные radio остаются источником состояния
   (их .checked + событие 'change'), поэтому автосохранение (bindGated/bindField)
   и валидация обязательных полей работают без изменений.

   Подключение: после рендера блока — initToggles(container).
   --------------------------------------------------------------------------- */

export function initToggles(container) {
  container.querySelectorAll('.radio-row').forEach(row => {
    if (row.__toggle) return;
    const radios = [...row.querySelectorAll('input[type="radio"]')];
    if (radios.length !== 2) return;   // только бинарные группы
    setupToggle(row, radios);
  });
}

function setupToggle(row, radios) {
  row.__toggle = true;
  row.classList.add('toggle');

  const segs = [...row.querySelectorAll('.radio')];
  const knob = document.createElement('span');
  knob.className = 'toggle-knob';
  row.appendChild(knob);

  let index = radios.findIndex(r => r.checked);   // -1, если ничего не выбрано

  // Отрисовать положение ползунка и активную подпись.
  function reflect(animate = true) {
    if (!animate) knob.style.transition = 'none';
    if (index < 0) {
      row.classList.add('toggle--unset');
      segs.forEach(s => s.classList.remove('is-active'));
    } else {
      row.classList.remove('toggle--unset');
      knob.style.transform = `translateX(${index * 100}%)`;
      segs.forEach((s, i) => s.classList.toggle('is-active', i === index));
    }
    if (!animate) { void knob.offsetHeight; knob.style.transition = ''; }
  }
  reflect(false);

  // Выбрать сторону i: обновляем radio и шлём 'change' (autosave/детали).
  function select(i) {
    index = i;
    radios.forEach((r, j) => { r.checked = j === i; });
    reflect();
    radios[i].dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---- Перетаскивание ----
  let dragging = false, dragMoved = false, knobW = 0, startX = 0, baseTx = 0;

  function onMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) dragMoved = true;
    if (dragMoved) {
      row.classList.remove('toggle--unset');
      const tx = Math.max(0, Math.min(knobW, baseTx + dx));
      knob.style.transform = `translateX(${tx}px)`;
    }
  }
  function onUp(e) {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (!dragging) return;
    dragging = false;
    knob.style.transition = '';
    if (dragMoved) {
      const tx = Math.max(0, Math.min(knobW, baseTx + (e.clientX - startX)));
      select(tx > knobW / 2 ? 1 : 0);
      setTimeout(() => { dragMoved = false; }, 0);   // погасить «клик» после drag
    }
  }
  row.addEventListener('pointerdown', e => {
    dragging = true;
    dragMoved = false;
    knobW = knob.getBoundingClientRect().width;
    startX = e.clientX;
    baseTx = (index < 0 ? 0 : index) * knobW;
    knob.style.transition = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });

  // ---- Клик по стороне (тап) ----
  segs.forEach((s, i) => s.addEventListener('click', e => {
    e.preventDefault();              // не даём нативному label дёргать radio
    if (dragMoved) return;           // это было перетаскивание, а не тап
    select(i);
  }));
}
