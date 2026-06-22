/* ---------------------------------------------------------------------------
   nav.js
   ------
   Боковая навигация по разделам анкеты.
     • Десктоп — вертикальный «стеклянный» бар слева (как на референсе, но в
       нашей синей палитре).
     • Телефон — горизонтальная липкая полоса сверху со скроллом вбок; активный
       раздел сам подкручивается в центр.

   Переходы разрешены только на уже пройденные разделы и на текущий — вперёд
   только кнопкой «Дальше» (там работает проверка обязательных полей).

   Экспортирует renderSectionNav(host, { current, visited, level, onJump }).
   --------------------------------------------------------------------------- */

// Иконки (24×24, наследуют цвет через currentColor).
const ICONS = {
  spark:    '<path d="M12 2.5l1.9 5.1 5.1 1.9-5.1 1.9L12 16.5l-1.9-5.1L5 9.5l5.1-1.9z" fill="currentColor" stroke="none"/>',
  user:     '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-3.6 3.4-5.6 7.5-5.6s7.5 2 7.5 5.6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 2.8v4M16 2.8v4"/>',
  heart:    '<path d="M12 20.3l-1.3-1.2C6 14.9 3.2 12.4 3.2 9.2 3.2 6.7 5.1 5 7.5 5c1.4 0 2.7.65 3.5 1.7.8-1.05 2.1-1.7 3.5-1.7 2.4 0 4.3 1.7 4.3 4.2 0 3.2-2.8 5.7-7.5 9.9z"/>',
  droplet:  '<path d="M12 3.2s5.8 6.1 5.8 10.4a5.8 5.8 0 0 1-11.6 0C6.2 9.3 12 3.2 12 3.2z"/>',
  utensils: '<path d="M7 3v18M5 3v5.5a2 2 0 0 0 4 0V3M17 3c-1.6 0-2.8 1.8-2.8 5s1.2 4 2.8 4v9"/>',
  moon:     '<path d="M20 14.6A8 8 0 0 1 9.4 4 8 8 0 1 0 20 14.6z"/>',
  users:    '<circle cx="9" cy="8" r="3.2"/><path d="M3.2 20c0-3.2 2.6-5 5.8-5s5.8 1.8 5.8 5"/><path d="M16.2 5.2a3.2 3.2 0 0 1 0 6.2M17.5 20c0-2.2-.7-3.6-1.8-4.6"/>',
  pin:      '<path d="M12 21s6.5-5.6 6.5-10.5A6.5 6.5 0 1 0 5.5 10.5C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.2" r="2.4"/>',
  check:    '<circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.8 2.8L16 9.5"/>'
};

// Разделы в порядке прохождения. У каждого — какие шаги он покрывает (steps),
// куда ведёт клик (step) и нужен ли уровень выше любителя (pro).
const SECTIONS = [
  { key: 'intro',     steps: ['level', 'goal'], step: 'level',     label: 'Начало',       icon: 'spark' },
  { key: 'identity',  steps: ['identity'],      step: 'identity',  label: 'Паспорт',      icon: 'user' },
  { key: 'event',     steps: ['event'],         step: 'event',     label: 'Соревнования', icon: 'calendar' },
  { key: 'medical',   steps: ['medical'],       step: 'medical',   label: 'Здоровье',     icon: 'heart' },
  { key: 'endocrine', steps: ['endocrine'],     step: 'endocrine', label: 'Гормоны',      icon: 'droplet' },
  { key: 'nutrition', steps: ['nutrition'],     step: 'nutrition', label: 'Питание',      icon: 'utensils' },
  { key: 'sleep',     steps: ['sleep'],         step: 'sleep',     label: 'Сон',          icon: 'moon' },
  { key: 'family',    steps: ['family'],        step: 'family',    label: 'Семья',        icon: 'users', pro: true },
  { key: 'logistics', steps: ['logistics'],     step: 'logistics', label: 'Логистика',    icon: 'pin',   pro: true },
  { key: 'done',      steps: ['done'],          step: 'done',      label: 'Отправка',     icon: 'check' }
];

export function renderSectionNav(host, { current, visited, level, onJump }) {
  // Любителям блоки 7–8 не показываем (их нет и в потоке).
  const sections = SECTIONS.filter(s => !s.pro || level !== 'amateur');

  host.innerHTML = sections.map(s => {
    const active   = s.steps.includes(current);
    const unlocked = active || s.steps.some(st => visited.has(st));
    const cls = ['nav-item', active ? 'active' : '', unlocked ? '' : 'locked']
      .filter(Boolean).join(' ');
    return `
      <button type="button" class="${cls}" data-step="${s.step}"
        title="${s.label}" aria-label="${s.label}" ${unlocked ? '' : 'disabled'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[s.icon]}</svg>
      </button>`;
  }).join('');

  host.querySelectorAll('.nav-item:not(.locked)').forEach(btn => {
    btn.addEventListener('click', () => onJump(btn.dataset.step));
  });

  centerActive(host);
}

// На мобильной полосе подкручиваем активный раздел к центру.
function centerActive(host) {
  const a = host.querySelector('.nav-item.active');
  if (!a) return;
  if (host.scrollWidth > host.clientWidth + 4) {
    const target = a.offsetLeft - (host.clientWidth - a.offsetWidth) / 2;
    host.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }
}
