import { validateConfig, DEFAULT_CONFIG } from './config.js';
import { buildSystemPrompt, buildUserPrompt, buildDefinePrompt } from './prompt.js';
import { generateContent, testApiKey } from './llm.js';
import { getApiKey, setApiKey, getModel, setModel, getSettings, setSettings, appendHistory } from './storage.js';
import { toggleLoading, renderContent, renderError } from './display.js';

function readConfig() {
  const sentenceRaw = document.getElementById('sentence-length').value;
  return {
    ...DEFAULT_CONFIG,
    provider:              document.getElementById('provider').value,
    targetLanguage:        document.getElementById('target-language').value.trim(),
    cefrLevel:             document.getElementById('cefr-level').value,
    wordCap:               parseInt(document.getElementById('word-cap').value, 10),
    targetDialect:         document.getElementById('target-dialect').value,
    nativeLanguage:        document.getElementById('native-language').value.trim(),
    tenseFocus:            document.getElementById('tense-focus').value
                             .split(',').map(s => s.trim()).filter(Boolean),
    sentenceLengthCeiling: sentenceRaw ? parseInt(sentenceRaw, 10) : null,
    connectorDensity:      document.getElementById('connector-density').value,
    includeWords:          document.getElementById('include-words').value.trim(),
    excludeWords:          document.getElementById('exclude-words').value.trim(),
    topic:                 document.getElementById('topic').value.trim(),
    outputFormat:          document.getElementById('output-format').value,
    outputLength:          document.getElementById('output-length').value,
    narrativePerson:       document.getElementById('narrative-person').value,
  };
}

async function handleGenerate(e) {
  e.preventDefault();

  const config = readConfig();
  const { valid, errors } = validateConfig(config);
  if (!valid) {
    renderError(errors.join(' · '));
    return;
  }

  const apiKey = getApiKey(config.provider);
  if (!apiKey) {
    renderError(`No API key set for ${config.provider}. Open Settings to add one.`);
    return;
  }

  toggleLoading(true);

  try {
    const prompts = {
      system: buildSystemPrompt(config),
      user:   buildUserPrompt(config),
    };

    const model   = getModel(config.provider);
    const content  = await generateContent(prompts, config.provider, apiKey, model || undefined);
    const wordCount = content.trim().split(/\s+/).length;
    const date      = new Date().toLocaleDateString();

    renderContent(content, { cefrLevel: config.cefrLevel, wordCount, topic: config.topic, date });
    appendHistory({ id: Date.now(), date, config, content, wordCount });
  } catch (err) {
    renderError(err.message ?? 'An unexpected error occurred.');
  }
}

function openSettings() {
  ['claude', 'openai', 'google'].forEach(provider => {
    document.getElementById(`api-key-${provider}`).value = getApiKey(provider);
    document.getElementById(`model-${provider}`).value   = getModel(provider);
  });
  document.getElementById('modal-theme').value = getSettings().ui.theme || 'system';
  document.getElementById('settings-modal').showModal();
}

function saveSettings() {
  ['claude', 'openai', 'google'].forEach(provider => {
    setApiKey(provider, document.getElementById(`api-key-${provider}`).value.trim());
    const model = document.getElementById(`model-${provider}`).value.trim();
    if (model) setModel(provider, model);
  });
  const settings = getSettings();
  settings.ui.theme = document.getElementById('modal-theme').value;
  setSettings(settings);
  applyTheme(settings.ui.theme);
  document.getElementById('settings-modal').close();
}

async function handleTestKey(provider) {
  const keyInput = document.getElementById(`api-key-${provider}`);
  const statusEl = document.getElementById(`test-status-${provider}`);
  const btn      = document.querySelector(`.key-test-btn[data-provider="${provider}"]`);

  btn.disabled    = true;
  btn.textContent = 'Testing…';
  statusEl.hidden = false;
  statusEl.className = 'test-status';
  statusEl.textContent = '';

  try {
    await testApiKey(provider, keyInput.value.trim());
    statusEl.textContent = '✓ Valid';
    statusEl.classList.add('ok');
  } catch (err) {
    const isNetworkError = err instanceof TypeError;
    statusEl.textContent = isNetworkError
      ? '✗ Network error — Claude can\'t be tested in-browser (CORS)'
      : `✗ ${err.message}`;
    statusEl.classList.add('fail');
  } finally {
    setTimeout(() => {
      btn.disabled    = false;
      btn.textContent = 'Test';
      statusEl.hidden = true;
    }, 4000);
  }
}

// ── Theme ─────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute(
    'data-theme',
    theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  );
}

applyTheme(getSettings().ui.theme || 'system');

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((getSettings().ui.theme || 'system') === 'system') applyTheme('system');
});

// ── Resizer ───────────────────────────────────────────────────────────────────

(function initResizer() {
  const resizer   = document.getElementById('resizer');
  const MIN_WIDTH = 240;
  const MAX_WIDTH = 640;

  const saved = localStorage.getItem('krashen_config_width');
  if (saved) document.documentElement.style.setProperty('--config-width', saved + 'px');

  let dragging = false;

  resizer.addEventListener('mousedown', (e) => {
    dragging = true;
    resizer.classList.add('dragging');
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const appRect  = document.getElementById('app').getBoundingClientRect();
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - appRect.left));
    document.documentElement.style.setProperty('--config-width', newWidth + 'px');
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('dragging');
    document.body.style.userSelect = '';
    const w = getComputedStyle(document.documentElement).getPropertyValue('--config-width').trim();
    localStorage.setItem('krashen_config_width', parseInt(w));
  });
})();

// ── Provider hint ─────────────────────────────────────────────────────────────

const providerSelect = document.getElementById('provider');
const providerHint   = document.getElementById('provider-hint');
function updateProviderHint() {
  providerHint.hidden = providerSelect.value !== 'claude';
}
providerSelect.addEventListener('change', updateProviderHint);
updateProviderHint();

// ── Show/hide key toggles ─────────────────────────────────────────────────────

document.querySelectorAll('.key-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input     = document.getElementById(btn.dataset.target);
    const showing   = input.type === 'text';
    input.type      = showing ? 'password' : 'text';
    btn.textContent = showing ? 'Show' : 'Hide';
  });
});

// ── Test key buttons ──────────────────────────────────────────────────────────

document.querySelectorAll('.key-test-btn').forEach(btn => {
  btn.addEventListener('click', () => handleTestKey(btn.dataset.provider));
});

// ── Define feature ───────────────────────────────────────────────────────────

let defineEnabled = false;
const defineBtn   = document.getElementById('define-btn');
const definePopup = document.getElementById('define-popup');
const defineWord  = document.getElementById('define-word');
const defineResult = document.getElementById('define-result');

function showDefinePopup(x, y, word) {
  defineWord.textContent   = word;
  defineResult.textContent = '…';
  definePopup.hidden = false;
  const popW = 280;
  definePopup.style.left = `${Math.min(x + 8, window.innerWidth - popW - 8)}px`;
  definePopup.style.top  = `${y + 16}px`;
}

function hideDefinePopup() {
  definePopup.hidden = true;
}

defineBtn.addEventListener('click', () => {
  defineEnabled = !defineEnabled;
  defineBtn.setAttribute('aria-pressed', String(defineEnabled));
});

document.getElementById('content-display').addEventListener('mouseup', async () => {
  if (!defineEnabled) return;
  const sel  = window.getSelection();
  const text = sel?.toString().trim();
  if (!text) { hideDefinePopup(); return; }

  const range   = sel.getRangeAt(0);
  const context = range.commonAncestorContainer.parentElement?.textContent ?? '';
  const rect    = range.getBoundingClientRect();

  const provider      = document.getElementById('provider').value;
  const apiKey        = getApiKey(provider);
  const model         = getModel(provider) || undefined;
  const targetLang    = document.getElementById('target-language').value.trim();
  const nativeLang    = document.getElementById('native-language').value.trim();

  if (!apiKey) {
    showDefinePopup(rect.right, rect.bottom, text);
    defineResult.textContent = 'No API key set';
    return;
  }

  showDefinePopup(rect.right, rect.bottom, text);

  try {
    const prompts    = buildDefinePrompt(text, context, targetLang, nativeLang);
    const translation = await generateContent(prompts, provider, apiKey, model);
    defineResult.textContent = translation.trim();
  } catch (err) {
    defineResult.textContent = err.message ?? 'Error';
  }
});

document.addEventListener('selectionchange', () => {
  if (!defineEnabled) return;
  if (!window.getSelection()?.toString().trim()) hideDefinePopup();
});

// ── Main event wiring ─────────────────────────────────────────────────────────

document.getElementById('config-form').addEventListener('submit', handleGenerate);
document.getElementById('settings-btn').addEventListener('click', openSettings);
document.getElementById('save-settings').addEventListener('click', saveSettings);
document.getElementById('close-settings').addEventListener('click', () => {
  document.getElementById('settings-modal').close();
});
document.getElementById('settings-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.close();
});

// ── Version display ───────────────────────────────────────────────────────────

fetch('./package.json')
  .then(r => r.json())
  .then(pkg => {
    const el = document.getElementById('app-version');
    if (el && pkg.version) el.textContent = `v${pkg.version}`;
  })
  .catch(() => {});
