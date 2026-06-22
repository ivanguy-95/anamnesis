/* ---------------------------------------------------------------------------
   datepicker.js
   -------------
   Кастомный календарь вместо нативного <input type="date">. Дизайн взят с
   референса (скруглённая карточка, кружок выделенной даты, круглые стрелки),
   но в нашей палитре (белый фон, синий акцент).

   Контракт значения:
     • поле показывает дату как ДД.ММ.ГГГГ (читаемо и в отчёте);
     • input.dataset.iso хранит ГГГГ-ММ-ДД — для расчётов (new Date(iso));
     • при выборе даты диспатчится событие 'change' — чтобы сработал autosave
       и валидация обязательных полей.

   Подключение: в разметке поле должно быть
     <input ... type="text" data-datepicker readonly>
   и в блоке после рендера — initDatePickers(container).
   --------------------------------------------------------------------------- */

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

// ---- Привязка ко всем полям с data-datepicker внутри контейнера ----
export function initDatePickers(container) {
  container.querySelectorAll('input[data-datepicker]').forEach(attach);
}

function attach(input) {
  if (input.__dpBound) return;
  input.__dpBound = true;
  input.readOnly = true;

  // Нормализуем уже сохранённое значение (ISO из старых данных или ДД.ММ.ГГГГ).
  const initial = parseDate(input.value);
  if (initial) {
    input.value = fmtDisplay(initial);
    input.dataset.iso = fmtISO(initial);
  } else {
    input.value = '';
    delete input.dataset.iso;
  }

  const open = e => { e.preventDefault(); openPopup(input); };
  input.addEventListener('click', open);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') open(e);
  });
}

// ---- Открытие/закрытие попапа (он один на странице) ----
let activePopup = null;

function closePopup() {
  if (!activePopup) return;
  activePopup.backdrop.remove();
  activePopup.el.remove();
  window.removeEventListener('resize', closePopup);
  window.removeEventListener('scroll', closePopup, true);
  activePopup = null;
}

function openPopup(input) {
  closePopup();

  const selected = input.dataset.iso ? parseDate(input.dataset.iso) : null;
  const today = new Date();
  let view = selected || today;
  let viewYear = view.getFullYear();
  let viewMonth = view.getMonth();

  const backdrop = document.createElement('div');
  backdrop.className = 'dp-backdrop';
  backdrop.addEventListener('click', closePopup);

  const el = document.createElement('div');
  el.className = 'dp-popup';
  el.addEventListener('click', e => e.stopPropagation());

  document.body.appendChild(backdrop);
  document.body.appendChild(el);
  activePopup = { el, backdrop, input };

  function selectDate(d) {
    input.value = fmtDisplay(d);
    input.dataset.iso = fmtISO(d);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    closePopup();
  }

  function render() {
    el.innerHTML = `
      <div class="dp-header">
        <button type="button" class="dp-nav" data-nav="-1" aria-label="Предыдущий месяц">‹</button>
        <div class="dp-title">${MONTHS[viewMonth]} ${viewYear}</div>
        <button type="button" class="dp-nav" data-nav="1" aria-label="Следующий месяц">›</button>
      </div>
      <div class="dp-weekdays">${WEEKDAYS.map(w => `<span>${w}</span>`).join('')}</div>
      <div class="dp-grid">${cellsHtml()}</div>
    `;

    el.querySelectorAll('.dp-nav').forEach(btn =>
      btn.addEventListener('click', () => {
        viewMonth += Number(btn.dataset.nav);
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        else if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        render();
      })
    );
    el.querySelectorAll('.dp-cell:not(.dp-empty)').forEach(cell =>
      cell.addEventListener('click', () =>
        selectDate(new Date(Number(cell.dataset.y), Number(cell.dataset.m), Number(cell.dataset.d)))
      )
    );
  }

  function cellsHtml() {
    const first = new Date(viewYear, viewMonth, 1);
    const startOffset = (first.getDay() + 6) % 7;          // Пн-первый
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const rows = Math.ceil((startOffset + daysInMonth) / 7);
    const start = new Date(viewYear, viewMonth, 1 - startOffset);

    let html = '';
    for (let i = 0; i < rows * 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const inMonth = d.getMonth() === viewMonth;
      const cls = [
        'dp-cell',
        inMonth ? '' : 'dp-muted',
        isSameDay(d, today) ? 'dp-today' : '',
        selected && isSameDay(d, selected) ? 'dp-selected' : ''
      ].filter(Boolean).join(' ');
      html += `<button type="button" class="${cls}" data-y="${d.getFullYear()}" data-m="${d.getMonth()}" data-d="${d.getDate()}">${d.getDate()}</button>`;
    }
    return html;
  }

  render();
  position(el, input);
  window.addEventListener('resize', closePopup);
  window.addEventListener('scroll', closePopup, true);
}

// Позиционируем попап под полем; если не влезает снизу — над полем.
function position(el, input) {
  const r = input.getBoundingClientRect();
  const sx = window.scrollX || window.pageXOffset;
  const sy = window.scrollY || window.pageYOffset;
  const ph = el.offsetHeight;
  const pw = el.offsetWidth;

  let top = r.bottom + sy + 6;
  if (r.bottom + ph + 6 > window.innerHeight && r.top - ph - 6 > 0) {
    top = r.top + sy - ph - 6;                              // показать сверху
  }
  let left = r.left + sx;
  if (left + pw > sx + window.innerWidth - 8) {
    left = sx + window.innerWidth - pw - 8;                 // не вылезать за край
  }
  el.style.top = `${Math.max(8 + sy, top)}px`;
  el.style.left = `${Math.max(8, left)}px`;
}

// ---- Утилиты дат ----
function parseDate(str) {
  if (!str) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);            // ISO
  if (m) return valid(new Date(+m[1], +m[2] - 1, +m[3]));
  m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(str);              // ДД.ММ.ГГГГ
  if (m) return valid(new Date(+m[3], +m[2] - 1, +m[1]));
  return null;
}
function valid(d) { return d && !isNaN(d.getTime()) ? d : null; }
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDisplay(d) { return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; }
function fmtISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}
