/* ---------------------------------------------------------------------------
   validate.js
   -----------
   Общая валидация обязательных полей (со звёздочкой) для блоков опросника.

   Идея: каждое обязательное поле помечено в разметке `<span class="req">*</span>`
   внутри своей метки. Перед переходом «Дальше» блок вызывает
   validateRequired(container):

     • собираем все видимые обязательные поля (скрытые/условные — пропускаем);
     • если есть незаполненные — НЕ пускаем дальше, прокручиваем к первому,
       подсвечиваем красным и ставим фокус;
     • подсветка появляется только после нажатия «Дальше» и снимается, как
       только поле заполнено.

   Возвращает true, если всё заполнено (можно идти дальше), иначе false.
   --------------------------------------------------------------------------- */

// Контейнер обязательного поля, к которому поднимаемся от звёздочки `.req`.
const FIELD_SELECTOR = '.field, .gated-row';

export function validateRequired(container) {
  ensureClearHandler(container);
  clearInvalid(container);

  const invalids = [];
  const seen = new Set();

  container.querySelectorAll('.req').forEach(star => {
    const field = star.closest(FIELD_SELECTOR);
    if (!field || seen.has(field)) return;
    seen.add(field);
    if (!isVisible(field)) return;        // скрытые/условные поля не требуем
    if (!isFilled(field)) invalids.push(field);
  });

  if (invalids.length === 0) return true;

  invalids.forEach(field => field.classList.add('field-invalid'));

  const first = invalids[0];
  first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const ctrl = first.querySelector(
    'input:not([type="radio"]), select, textarea, input[type="radio"]'
  );
  if (ctrl) {
    try { ctrl.focus({ preventScroll: true }); } catch { ctrl.focus(); }
  }
  return false;
}

// Поле заполнено? Радиогруппа — выбран хотя бы один вариант; остальные
// контролы — непустое значение.
function isFilled(field) {
  const radios = field.querySelectorAll('input[type="radio"]');
  if (radios.length) {
    if (Array.from(radios).some(r => r.checked)) return true;
    // «Не проверял»: скрытый radio not_checked в родительском .gated-item —
    // это тоже валидный ответ для обязательного вопроса.
    const item = field.closest('.gated-item');
    if (item && item.querySelector('input.nc-radio:checked')) return true;
    return false;
  }
  const ctrls = field.querySelectorAll(
    'input:not([type="radio"]):not([type="hidden"]), select, textarea'
  );
  if (!ctrls.length) return true;
  return Array.from(ctrls).every(c => String(c.value).trim() !== '');
}

// Элемент реально отрисован (не спрятан display:none у себя или предка).
function isVisible(el) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function clearInvalid(container) {
  container.querySelectorAll('.field-invalid').forEach(el =>
    el.classList.remove('field-invalid')
  );
}

// Один раз на контейнер: снимаем подсветку, как только поле заполнено.
function ensureClearHandler(container) {
  if (container.__reqClearBound) return;
  container.__reqClearBound = true;
  const clear = e => {
    const field = e.target.closest('.field-invalid');
    if (field && isFilled(field)) field.classList.remove('field-invalid');
  };
  container.addEventListener('input', clear);
  container.addEventListener('change', clear);
}
