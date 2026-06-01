/* ---------------------------------------------------------------------------
   state.js
   ---------
   Хранит JSON-профиль анамнеза. Источник истины — объект `profile` в памяти,
   зеркалируется в localStorage под ключом STORAGE_KEY.

   Структура `profile`:
     meta:
       level   — 'pro' | 'amateur' — первый жёсткий фильтр (уровень подготовки),
                  определяет, какие вопросы/блоки показывать.
       goal    — открытый текст цели спортсмена. В будущем будет подаваться
                  Claude API для генерации уточняющих вопросов.
     blocks    — 8 блоков опросника. У каждого: answers, status, skipped.

   API наружу:
     - loadProfile()                — читает из localStorage (или создаёт пустой)
     - saveProfile()                — пишет текущий профиль в localStorage
     - getProfile()                 — текущий объект (читать как readonly)
     - setMeta(key, value)          — записать значение в meta (level/goal/…)
     - setAnswer(block, key, value) — записать ответ в конкретный блок
     - exportJson()                 — сериализовать профиль (для скачивания/AI)
     - resetProfile()               — очистить всё (отладка)
   --------------------------------------------------------------------------- */

const STORAGE_KEY = 'anamnesis:profile:v1';

// Скелет профиля. Поля внутри блоков добавляются по мере реализации блоков.
function emptyProfile() {
  return {
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: null,
      version: 1,
      level: null,   // 'pro' | 'amateur'
      goal: ''       // открытая цель; вход для AI-уточнений в будущем
    },
    blocks: {
      identity:    { answers: {}, status: 'pending', skipped: [] },
      event:       { answers: {}, status: 'pending', skipped: [] },
      medical:     { answers: {}, status: 'pending', skipped: [] },
      endocrine:   { answers: {}, status: 'pending', skipped: [] },
      nutrition:   { answers: {}, status: 'pending', skipped: [] },
      sleep:       { answers: {}, status: 'pending', skipped: [] },
      family:      { answers: {}, status: 'pending', skipped: [] },
      logistics:   { answers: {}, status: 'pending', skipped: [] }
    }
  };
}

let profile = emptyProfile();

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Мягкий мердж: новые поля meta появятся даже у старых сохранённых сессий.
      profile = { ...emptyProfile(), ...parsed,
        meta: { ...emptyProfile().meta, ...(parsed.meta || {}) } };
    }
  } catch (e) {
    console.warn('Не удалось прочитать профиль из localStorage', e);
    profile = emptyProfile();
  }
  migrateLevelV2();
  return profile;
}

// Миграция уровня v1 → v2.
//   v1: 'pro' (вершина) | 'amateur'
//   v2: 'elite' (вершина) | 'pro' (середина) | 'amateur'
// Старое 'pro' соответствовало максимальному уровню с WADA-блоком,
// поэтому переименовываем его в 'elite'. Флаг защищает от повторного
// переноса, если пользователь сознательно выберет новое значение 'pro'.
function migrateLevelV2() {
  if (profile.meta.levelMigratedV2) return;
  if (profile.meta.level === 'pro') profile.meta.level = 'elite';
  profile.meta.levelMigratedV2 = true;
  saveProfile();
}

export function saveProfile() {
  profile.meta.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Не удалось сохранить профиль в localStorage', e);
  }
}

export function getProfile() {
  return profile;
}

export function setMeta(key, value) {
  profile.meta[key] = value;
  saveProfile();
}

export function setAnswer(blockId, key, value) {
  if (!profile.blocks[blockId]) {
    console.warn('Неизвестный блок:', blockId);
    return;
  }
  profile.blocks[blockId].answers[key] = value;
  saveProfile();
}

export function exportJson() {
  return JSON.stringify(profile, null, 2);
}

export function resetProfile() {
  profile = emptyProfile();
  saveProfile();
}
