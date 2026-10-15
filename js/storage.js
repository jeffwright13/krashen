const KEYS = {
  settings: 'krashen_settings',
  history:  'krashen_history',
};

const DEFAULT_SETTINGS = {
  apiKeys: { claude: '', openai: '', google: '' },
  models:  { claude: 'claude-opus-4-8', openai: 'gpt-6-luna', google: 'gemini-2.5-flash' },
  ui: { fontSize: 'medium', theme: 'system', maxWidth: true, maxWidthValue: 70 },
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function deepMerge(defaults, stored) {
  const result = {};
  for (const k of Object.keys(defaults)) {
    const defVal = defaults[k];
    const storedVal = stored[k];
    const defIsObj = defVal !== null && typeof defVal === 'object' && !Array.isArray(defVal);
    if (storedVal !== undefined) {
      result[k] = defIsObj ? deepMerge(defVal, storedVal) : storedVal;
    } else {
      result[k] = defIsObj ? deepMerge(defVal, {}) : defVal;
    }
  }
  return result;
}

// OpenAI removes these models from the API on 2027-01-14: GPT-4o, GPT-4o mini, GPT-4.1
// and GPT-4.1 mini, each with or without a dated snapshot suffix. Fine-tunes (ft:...) are
// deliberately excluded: they're user-specific, and silently swapping one for a base model
// would hide that it needs retraining.
const RETIRED_OPENAI_MODEL = /^gpt-4(o|\.1)(-mini)?(-\d{4}-\d{2}-\d{2})?$/;

// setSettings() persists the whole merged object, so a user who saved anything has the
// old default frozen in localStorage. Rewrite it on read; the next write persists the fix.
function migrateRetiredModels(settings) {
  const stored = settings.models.openai;
  if (typeof stored === 'string' && RETIRED_OPENAI_MODEL.test(stored.trim().toLowerCase())) {
    settings.models.openai = DEFAULT_SETTINGS.models.openai;
  }
  return settings;
}

export function getSettings() {
  const stored = read(KEYS.settings, {});
  return migrateRetiredModels(deepMerge(DEFAULT_SETTINGS, stored));
}

export function setSettings(settings) {
  write(KEYS.settings, settings);
}

export function getApiKey(provider) {
  return getSettings().apiKeys[provider] ?? '';
}

export function setApiKey(provider, key) {
  const settings = getSettings();
  settings.apiKeys[provider] = key;
  setSettings(settings);
}

export function getModel(provider) {
  return getSettings().models[provider] ?? '';
}

export function setModel(provider, model) {
  const settings = getSettings();
  settings.models[provider] = model;
  setSettings(settings);
}

export function getHistory() {
  return read(KEYS.history, []);
}

export function appendHistory(entry) {
  const history = getHistory();
  history.push(entry);
  write(KEYS.history, history);
}

export function deleteHistoryEntry(id) {
  write(KEYS.history, getHistory().filter(e => e.id !== id));
}

export function clearHistory() {
  write(KEYS.history, []);
}

export function mergeHistory(entries) {
  const existing = getHistory();
  const existingIds = new Set(existing.map(e => e.id));
  const incoming = entries.filter(e => !existingIds.has(e.id));
  write(KEYS.history, [...existing, ...incoming]);
  return { imported: incoming.length, skipped: entries.length - incoming.length };
}

