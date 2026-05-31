import { validateConfig, DEFAULT_CONFIG } from './config.js';
import { buildSystemPrompt, buildUserPrompt, buildDefinePrompt } from './prompt.js';
import { generateContent, testApiKey } from './llm.js';
import { getApiKey, setApiKey, getModel, setModel, getSettings, setSettings, appendHistory } from './storage.js';
import { getHistory, deleteHistoryEntry, clearHistory } from './history.js';
import { exportPieceAsMarkdown, exportLibraryAsJSON, exportLibraryAsMarkdown } from './export.js';
import { parseLibraryJSON } from './import.js';
import { mergeHistory } from './storage.js';
import { toggleLoading, renderContent, renderError, showToast } from './display.js';

let currentEntry = null;

function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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
    outputLength:          parseInt(document.getElementById('output-length').value, 10) || 700,
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
    const activeProfile = window.KrashenProfiles?.getActive();
    const srsSettings   = activeProfile?.settings;
    const srsEnabled    = srsSettings?.srsEnabled !== false;

    let vocabContext = null;
    if (srsEnabled && window.KrashenVocab) {
      vocabContext = {
        ...window.KrashenVocab.getForPrompt({
          knownThreshold:     srsSettings?.knownThreshold     ?? 2,
          reExposeMaxMastery: srsSettings?.reExposeMaxMastery ?? 3,
          reExposeCount:      srsSettings?.reExposeCount      ?? 8,
        }),
        newWordsPerSession: srsSettings?.newWordsPerSession ?? 5,
      };
    }

    const prompts = {
      system: buildSystemPrompt(config, vocabContext),
      user:   buildUserPrompt(config),
    };

    const model    = getModel(config.provider);
    const content  = await generateContent(prompts, config.provider, apiKey, model || undefined);
    const wordCount = content.trim().split(/\s+/).length;
    const date      = new Date().toLocaleDateString();

    const firstLine = content.slice(0, content.indexOf('\n') === -1 ? content.length : content.indexOf('\n'));
    const title     = firstLine.startsWith('## ') ? firstLine.slice(3).trim() : null;
    currentEntry = { id: Date.now(), date, config, content, wordCount, topic: config.topic, title };
    renderContent(content, { cefrLevel: config.cefrLevel, wordCount, topic: config.topic, date });
    appendHistory(currentEntry);
    document.getElementById('export-piece-btn').hidden = false;

    if (window.KrashenVocab) {
      const words = [...new Set(
        content.toLowerCase().replace(/[¡!¿?.,;:«»"'()\-—]/g, ' ').split(/\s+/).filter(Boolean)
      )];
      window.KrashenVocab.recordSeen(words);
    }

    if (activeProfile) {
      window.KrashenProfiles.incrementWordsRead(activeProfile.id, wordCount);
      window.KrashenUI?.refreshChip();
    }
  } catch (err) {
    renderError(err.message ?? 'An unexpected error occurred.');
  }
}

function openSettings() {
  ['claude', 'openai', 'google'].forEach(provider => {
    document.getElementById(`api-key-${provider}`).value = getApiKey(provider);
    document.getElementById(`model-${provider}`).value   = getModel(provider);
  });
  const uiSettings = getSettings().ui;
  document.getElementById('modal-theme').value          = uiSettings.theme || 'system';
  const enabledEl = document.getElementById('modal-maxwidth-enabled');
  const valueEl   = document.getElementById('modal-maxwidth-value');
  enabledEl.checked  = uiSettings.maxWidth !== false;
  valueEl.value      = uiSettings.maxWidthValue ?? 70;
  valueEl.disabled   = !enabledEl.checked;
  window.KrashenUI?.refreshSettings();
  document.getElementById('settings-modal').showModal();
}

function saveSettings() {
  ['claude', 'openai', 'google'].forEach(provider => {
    setApiKey(provider, document.getElementById(`api-key-${provider}`).value.trim());
    const model = document.getElementById(`model-${provider}`).value.trim();
    if (model) setModel(provider, model);
  });
  window.KrashenUI?.saveSettings();
  const settings = getSettings();
  settings.ui.theme         = document.getElementById('modal-theme').value;
  settings.ui.maxWidth      = document.getElementById('modal-maxwidth-enabled').checked;
  settings.ui.maxWidthValue = parseInt(document.getElementById('modal-maxwidth-value').value, 10) || 70;
  setSettings(settings);
  applyTheme(settings.ui.theme);
  applyMaxWidth(settings.ui.maxWidth, settings.ui.maxWidthValue);
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

// ── Theme & layout ────────────────────────────────────────────────────────────

function applyTheme(theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute(
    'data-theme',
    theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  );
}

function applyMaxWidth(enabled, value) {
  document.documentElement.style.setProperty(
    '--content-max-width',
    enabled ? `${value}ch` : 'none'
  );
}

const _ui = getSettings().ui;
applyTheme(_ui.theme || 'system');
applyMaxWidth(_ui.maxWidth !== false, _ui.maxWidthValue ?? 70);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((getSettings().ui.theme || 'system') === 'system') applyTheme('system');
});

document.getElementById('modal-maxwidth-enabled').addEventListener('change', e => {
  document.getElementById('modal-maxwidth-value').disabled = !e.target.checked;
});

document.getElementById('modal-theme').addEventListener('change', (e) => {
  const settings = getSettings();
  settings.ui.theme = e.target.value;
  setSettings(settings);
  applyTheme(e.target.value);
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

// ── Select All / Copy ─────────────────────────────────────────────────────────

document.getElementById('select-all-btn').addEventListener('click', () => {
  const el    = document.getElementById('content-display');
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
});

document.getElementById('copy-btn').addEventListener('click', async () => {
  const el   = document.getElementById('content-display');
  const text = el.innerText.trim();
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  } catch {
    // clipboard unavailable (non-https or permission denied)
  }
});

// ── Define feature ───────────────────────────────────────────────────────────

let defineEnabled = false;
const defineBtn   = document.getElementById('define-btn');
const definePopup = document.getElementById('define-popup');
const defineWord  = document.getElementById('define-word');
const defineResult = document.getElementById('define-result');

function showDefinePopup(x, y, word) {
  definePopup.querySelector('.define-save-btn')?.remove();
  defineWord.textContent   = word;
  defineResult.textContent = '…';
  definePopup.hidden = false;
  const popW = 280;
  definePopup.style.left = `${Math.min(x + 8, window.innerWidth - popW - 8)}px`;
  definePopup.style.top  = `${y + 16}px`;
}

function hideDefinePopup() {
  definePopup.hidden = true;
  definePopup.querySelector('.define-save-btn')?.remove();
}

defineBtn.addEventListener('click', () => {
  defineEnabled = !defineEnabled;
  defineBtn.setAttribute('aria-pressed', String(defineEnabled));
  if (!defineEnabled) hideDefinePopup();
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
    const prompts     = buildDefinePrompt(text, context, targetLang, nativeLang);
    const translation = await generateContent(prompts, provider, apiKey, model);
    defineResult.textContent = translation.trim();

    const activeProfile = window.KrashenProfiles?.getActive();
    if (window.KrashenVocab && activeProfile) {
      if (activeProfile.settings?.autosave) {
        window.KrashenVocab.recordLookup(text, translation.trim(), context);
        showToast('Saved to vocab');
      } else {
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save to vocab';
        saveBtn.className   = 'define-save-btn';
        saveBtn.addEventListener('click', () => {
          window.KrashenVocab.recordLookup(text, translation.trim(), context);
          showToast('Saved to vocab');
          saveBtn.remove();
        });
        definePopup.appendChild(saveBtn);
      }
    }
  } catch (err) {
    defineResult.textContent = err.message ?? 'Error';
  }
});

document.addEventListener('selectionchange', () => {
  if (!defineEnabled) return;
  if (!window.getSelection()?.toString().trim()) hideDefinePopup();
});

// ── Font size ─────────────────────────────────────────────────────────────────

const FONT_SIZES = ['small', 'medium', 'large'];

function applyFontSize(size) {
  const display = document.getElementById('content-display');
  FONT_SIZES.forEach(s => display.classList.toggle(`font-${s}`, s === size));
  document.getElementById('font-size-select').value = size;
  const settings = getSettings();
  settings.ui.fontSize = size;
  setSettings(settings);
}

document.getElementById('font-size-select').addEventListener('change', e => {
  applyFontSize(e.target.value);
});

applyFontSize(getSettings().ui.fontSize || 'medium');

// ── Fullscreen ────────────────────────────────────────────────────────────────

const fullscreenBtn = document.getElementById('fullscreen-btn');

fullscreenBtn.addEventListener('click', () => {
  const app = document.getElementById('app');
  const on  = app.classList.toggle('fullscreen');
  fullscreenBtn.textContent = on ? '✕ Collapse' : '⤢';
  fullscreenBtn.title       = on ? 'Restore panels' : 'Expand reading panel';
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('app').classList.contains('fullscreen')) {
    document.getElementById('app').classList.remove('fullscreen');
    fullscreenBtn.textContent = '⤢';
    fullscreenBtn.title       = 'Expand reading panel';
  }
});

// ── History modal ─────────────────────────────────────────────────────────────

function renderHistoryList() {
  const list      = document.getElementById('history-list');
  const empty     = document.getElementById('history-empty');
  const filterVal = document.getElementById('history-filter').value.toLowerCase().trim();

  let entries = getHistory().slice().reverse();
  if (filterVal) {
    entries = entries.filter(e =>
      (e.title ?? '').toLowerCase().includes(filterVal) ||
      (e.topic ?? '').toLowerCase().includes(filterVal)
    );
  }

  list.querySelectorAll('.history-item').forEach(el => el.remove());

  if (entries.length === 0) {
    empty.hidden = false;
    updateBulkControls();
    return;
  }
  empty.hidden = true;

  entries.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.setAttribute('role', 'listitem');

    const cefr   = entry.config?.cefrLevel ?? '';
    const detail = [cefr, `~${entry.wordCount} words`, entry.date].filter(Boolean).join(' · ');

    item.innerHTML = `
      <label class="history-item-check" aria-label="Select">
        <input type="checkbox" class="history-checkbox" data-id="${entry.id}">
      </label>
      <div class="history-item-meta">
        <span class="history-item-topic"></span>
        <span class="history-item-details"></span>
      </div>
      <div class="history-item-actions">
        <button class="outline secondary load-btn">Load</button>
        <button class="outline secondary delete-btn">Delete</button>
      </div>`;

    const topicLabel = entry.title ?? entry.topic ?? '(no topic)';
    const topicEl    = item.querySelector('.history-item-topic');
    topicEl.textContent = topicLabel;
    topicEl.title       = topicLabel;
    item.querySelector('.history-item-details').textContent = detail;
    item.querySelector('.history-checkbox').addEventListener('change', updateBulkControls);

    item.querySelector('.load-btn').addEventListener('click', () => {
      currentEntry = entry;
      renderContent(entry.content, {
        cefrLevel: entry.config?.cefrLevel ?? '',
        wordCount: entry.wordCount,
        topic:     entry.topic ?? '',
        date:      entry.date,
      });
      document.getElementById('export-piece-btn').hidden = false;
      document.getElementById('history-modal').close();
    });

    item.querySelector('.delete-btn').addEventListener('click', () => {
      if (!confirm(`Delete "${entry.topic ?? 'this entry'}"?`)) return;
      deleteHistoryEntry(entry.id);
      renderHistoryList();
    });

    list.appendChild(item);
  });

  updateBulkControls();
}

function updateBulkControls() {
  const checkboxes   = [...document.querySelectorAll('#history-list .history-checkbox')];
  const checkedCount = checkboxes.filter(c => c.checked).length;
  const selectAll    = document.getElementById('history-select-all');
  const deleteBtn    = document.getElementById('delete-selected-btn');
  const selectText   = document.getElementById('history-select-all-text');

  selectAll.checked       = checkboxes.length > 0 && checkedCount === checkboxes.length;
  selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
  deleteBtn.disabled      = checkedCount === 0;
  selectText.textContent  = checkboxes.length > 0
    ? `Select all (${checkboxes.length})`
    : 'Select all';
}

function openHistory() {
  document.getElementById('import-status').hidden = true;
  document.getElementById('history-filter').value = '';
  renderHistoryList();
  document.getElementById('history-modal').showModal();
}

document.getElementById('history-btn').addEventListener('click', openHistory);
document.getElementById('close-history').addEventListener('click', () => {
  document.getElementById('history-modal').close();
});
document.getElementById('history-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.close();
});

document.getElementById('history-filter').addEventListener('input', renderHistoryList);

document.getElementById('history-select-all').addEventListener('change', e => {
  document.querySelectorAll('#history-list .history-checkbox').forEach(cb => {
    cb.checked = e.target.checked;
  });
  updateBulkControls();
});

document.getElementById('delete-selected-btn').addEventListener('click', () => {
  const ids = [...document.querySelectorAll('#history-list .history-checkbox:checked')]
    .map(cb => Number(cb.dataset.id));
  if (!ids.length) return;
  if (!confirm(`Delete ${ids.length} selected item${ids.length !== 1 ? 's' : ''}?`)) return;
  ids.forEach(id => deleteHistoryEntry(id));
  renderHistoryList();
});

document.getElementById('clear-history-btn').addEventListener('click', () => {
  if (!confirm('Clear all history? This cannot be undone.')) return;
  clearHistory();
  renderHistoryList();
});

// ── Export ────────────────────────────────────────────────────────────────────

document.getElementById('export-piece-btn').addEventListener('click', () => {
  if (!currentEntry) return;
  const slug = (currentEntry.topic ?? 'piece').replace(/[^a-z0-9]+/gi, '-').slice(0, 40).toLowerCase();
  triggerDownload(`krashen-${slug}.md`, exportPieceAsMarkdown(currentEntry), 'text/markdown');
});

document.getElementById('export-json-btn').addEventListener('click', () => {
  triggerDownload('krashen-library.json', exportLibraryAsJSON(getHistory()), 'application/json');
});

document.getElementById('export-md-library-btn').addEventListener('click', () => {
  triggerDownload('krashen-library.md', exportLibraryAsMarkdown(getHistory()), 'text/markdown');
});

// ── Import ────────────────────────────────────────────────────────────────────

const importFile   = document.getElementById('import-file');
const importStatus = document.getElementById('import-status');

document.getElementById('import-btn').addEventListener('click', () => importFile.click());

importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const entries = parseLibraryJSON(e.target.result);
      const { imported, skipped } = mergeHistory(entries);
      importStatus.textContent = `Imported ${imported} piece${imported !== 1 ? 's' : ''}`
        + (skipped > 0 ? ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)` : '') + '.';
      importStatus.className = 'import-status ok';
      importStatus.hidden    = false;
      renderHistoryList();
    } catch (err) {
      importStatus.textContent = `Import failed: ${err.message}`;
      importStatus.className   = 'import-status fail';
      importStatus.hidden      = false;
    }
    importFile.value = '';
  };
  reader.readAsText(file);
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
