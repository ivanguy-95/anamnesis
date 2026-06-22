/* ---------------------------------------------------------------------------
   blocks/preamble.js
   ------------------
   Два экрана-преамбулы перед основной анкетой:
     • renderLevel(container, { onNext })          — уровень подготовки
     • renderGoal(container, { onBack, onNext })   — открытая цель

   Уровень — жёсткий фильтр на видимость блоков и вопросов в дальнейшем.
   Цель — открытый текст, сохраняется в meta.goal. В будущем будет подаваться
   в Claude API для генерации уточняющих вопросов внутри блоков.
   --------------------------------------------------------------------------- */

import { getProfile, setMeta } from '../state.js';

export function renderLevel(container, { onNext }) {
  const meta = getProfile().meta;

  container.innerHTML = `
    <header class="step-header">
      <div class="step-eyebrow">Шаг 1 из 2 · Перед началом</div>
      <h1 class="step-title">Уровень спортивной подготовки</h1>
      <p class="step-lead">Этот выбор определяет, какие блоки и вопросы будут показаны дальше</p>
    </header>

    <section class="form-section">
      <div class="level-cards" role="radiogroup">
        <button class="level-card ${meta.level === 'elite' ? 'selected' : ''}"
                data-value="elite" type="button">
          <div class="level-card-title">Элита</div>
          <div class="level-card-desc">
            Спортсмены, выступающие в сборных, командах и клубах на высоком уровне
          </div>
        </button>
        <button class="level-card ${meta.level === 'pro' ? 'selected' : ''}"
                data-value="pro" type="button">
          <div class="level-card-title">Профессионал</div>
          <div class="level-card-desc">
            Спортсмены, выступающие на высоком уровне в частных и крупных соревнованиях
          </div>
        </button>
        <button class="level-card ${meta.level === 'amateur' ? 'selected' : ''}"
                data-value="amateur" type="button">
          <div class="level-card-title">Любитель</div>
          <div class="level-card-desc">
            Спортсмены, занимающиеся спортом для поддержания формы
          </div>
        </button>
      </div>
    </section>

    <nav class="step-nav">
      <button class="btn-ghost" type="button" disabled>← Назад</button>
      <button class="btn-primary" id="next-btn" type="button"
        ${meta.level ? '' : 'disabled'}>Дальше</button>
    </nav>
  `;

  // Карточка-радио: при клике помечаем выбранной, сохраняем в state,
  // активируем кнопку «Дальше».
  container.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      setMeta('level', card.dataset.value);
      container.querySelector('#next-btn').disabled = false;
    });
  });

  container.querySelector('#next-btn').addEventListener('click', onNext);
}

export function renderGoal(container, { onBack, onNext }) {
  const meta = getProfile().meta;

  container.innerHTML = `
    <header class="step-header">
      <div class="step-eyebrow">Шаг 2 из 2 · Перед началом</div>
      <h1 class="step-title">Ваша цель</h1>
      <p class="step-lead">Чего вы хотите добиться с помощью схемы? Сформулируйте свободным текстом — чем подробнее, тем точнее будут подобраны последующие вопросы.</p>
    </header>

    <section class="form-section">
      <textarea id="goal" class="textarea" rows="6"
        placeholder="Например: подготовиться к Ironman 70.3 в июле, удержать массу 72 кг, восстановить ферритин"
      >${escapeText(meta.goal)}</textarea>
    </section>

    <nav class="step-nav">
      <button class="btn-ghost"   id="back-btn" type="button">← Назад</button>
      <button class="btn-primary" id="next-btn" type="button">Дальше</button>
    </nav>
  `;

  const goalEl = container.querySelector('#goal');
  const saveGoal = () => setMeta('goal', goalEl.value.trim());
  goalEl.addEventListener('blur', saveGoal);

  container.querySelector('#back-btn').addEventListener('click', onBack);
  container.querySelector('#next-btn').addEventListener('click', () => {
    saveGoal();
    onNext();
  });
}

function escapeText(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
