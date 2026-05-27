const KEYS = {
  settings: 'krashen_settings',
  history:  'krashen_history',
  vocab:    'krashen_vocab',
};

const DEFAULT_SETTINGS = {
  apiKeys: { claude: '', openai: '', google: '' },
  models:  { claude: 'claude-opus-4-5', openai: 'gpt-4o', google: 'gemini-2.5-flash' },
  defaultProfile: {},
  ui: { fontSize: 'medium', theme: 'light' },
};

const DEFAULT_VOCAB = { seenWords: [], sessions: [] };

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

export function getSettings() {
  const stored = read(KEYS.settings, {});
  return deepMerge(DEFAULT_SETTINGS, stored);
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

export function getVocab() {
  return read(KEYS.vocab, DEFAULT_VOCAB);
}
