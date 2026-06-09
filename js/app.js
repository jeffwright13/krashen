import { validateConfig, DEFAULT_CONFIG } from './config.js';
import { buildSystemPrompt, buildUserPrompt, buildDefinePrompt, parseDefineResponse } from './prompt.js';
import { generateContent, testApiKey } from './llm.js';
import { getApiKey, setApiKey, getModel, setModel, getSettings, setSettings } from './storage.js';
import { getHistory, appendHistory, deleteHistoryEntry, clearHistory, mergeHistory } from './history.js';
import { exportPieceAsMarkdown, exportLibraryAsJSON, exportLibraryAsMarkdown } from './export.js';
import { parseLibraryJSON } from './import.js';
import { toggleLoading, renderContent, renderError, showToast, triggerDownload } from './display.js';

let currentEntry   = null;
let lastPrompts    = null;  // { system, user } from most recent generation

function isVocabEnabled() {
  return window.KrashenProfiles?.getActive()?.settings?.vocabEnabled ?? true;
}

function persistCurrentEntry(entry) {
  currentEntry = entry;
  try { sessionStorage.setItem('krashen_current', JSON.stringify(entry)); } catch (_) {}
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
    renderError(`No API key set for ${config.provider}. Add one in the Provider section of the Configure tab.`);
    return;
  }

  toggleLoading(true);

  try {
    const activeProfile = window.KrashenProfiles?.getActive();
    const prompts = {
      system: buildSystemPrompt(config),
      user:   buildUserPrompt(config),
    };
    lastPrompts = prompts;
    updatePromptDebug();

    const model    = getModel(config.provider);
    const content  = await generateContent(prompts, config.provider, apiKey, model || undefined);
    const wordCount = content.trim().split(/\s+/).length;
    const date      = new Date().toLocaleDateString();

    const firstLine = content.slice(0, content.indexOf('\n') === -1 ? content.length : content.indexOf('\n'));
    const title     = firstLine.startsWith('## ') ? firstLine.slice(3).trim() : null;
    persistCurrentEntry({
      id: Date.now(), date, config, content, wordCount, topic: config.topic, title,
      profileId:   activeProfile?.id   ?? null,
      profileName: activeProfile?.name ?? null,
    });
    renderContent(content, { cefrLevel: config.cefrLevel, wordCount, topic: config.topic, date });
    appendHistory(currentEntry);
    document.getElementById('export-piece-btn').hidden = false;

    if (activeProfile) {
      window.KrashenProfiles.incrementWordsRead(activeProfile.id, wordCount);
      window.KrashenUI?.refreshChip();
    }
  } catch (err) {
    renderError(err.message ?? 'An unexpected error occurred.');
  }
}

const KEY_PLACEHOLDERS = {
  claude: 'sk-ant-…', openai: 'sk-…', google: 'AIza…',
};
const MODEL_PLACEHOLDERS = {
  claude: 'claude-opus-4-8', openai: 'gpt-4o', google: 'gemini-2.5-flash',
};

function initProviderSection() {
  const keyEl      = document.getElementById('api-key');
  const modelEl    = document.getElementById('api-model');
  const testBtn    = document.getElementById('test-key-btn');
  const testStatus = document.getElementById('test-key-status');
  const toggleBtn  = document.querySelector('.key-toggle-btn[data-target="api-key"]');

  function loadProvider(p) {
    keyEl.value         = getApiKey(p);
    keyEl.placeholder   = KEY_PLACEHOLDERS[p]   ?? '';
    modelEl.value       = getModel(p);
    modelEl.placeholder = MODEL_PLACEHOLDERS[p] ?? '';
    testStatus.hidden   = true;
    keyEl.type          = 'password';
    if (toggleBtn) toggleBtn.textContent = 'Show';
  }

  loadProvider(providerSelect.value);
  providerSelect.addEventListener('change', () => loadProvider(providerSelect.value));
  keyEl.addEventListener('blur',   () => setApiKey(providerSelect.value, keyEl.value.trim()));
  modelEl.addEventListener('blur', () => {
    if (modelEl.value.trim()) setModel(providerSelect.value, modelEl.value.trim());
  });
  testBtn.addEventListener('click', () =>
    handleTestKey(providerSelect.value, keyEl, testStatus, testBtn)
  );
}

function initDisplayPopover() {
  const btn      = document.getElementById('display-settings-btn');
  const popover  = document.getElementById('display-popover');
  const uiSettings = getSettings().ui;
  const themeEl  = document.getElementById('modal-theme');
  const enabledEl = document.getElementById('modal-maxwidth-enabled');
  const valueEl  = document.getElementById('modal-maxwidth-value');

  themeEl.value      = uiSettings.theme || 'system';
  enabledEl.checked  = uiSettings.maxWidth !== false;
  valueEl.value      = uiSettings.maxWidthValue ?? 70;
  valueEl.disabled   = !enabledEl.checked;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    popover.hidden = !popover.hidden;
  });
  document.addEventListener('click', e => {
    if (!popover.hidden && !popover.contains(e.target) && e.target !== btn) {
      popover.hidden = true;
    }
  });

  themeEl.addEventListener('change', () => {
    const s = getSettings(); s.ui.theme = themeEl.value; setSettings(s);
    applyTheme(themeEl.value);
  });
  enabledEl.addEventListener('change', () => {
    valueEl.disabled = !enabledEl.checked;
    const s = getSettings(); s.ui.maxWidth = enabledEl.checked; setSettings(s);
    applyMaxWidth(enabledEl.checked, parseInt(valueEl.value, 10) || 70);
  });
  valueEl.addEventListener('change', () => {
    const s = getSettings(); s.ui.maxWidthValue = parseInt(valueEl.value, 10) || 70; setSettings(s);
    applyMaxWidth(enabledEl.checked, s.ui.maxWidthValue);
  });
}

function updatePromptDebug() {
  if (!lastPrompts) return;
  document.getElementById('debug-system-prompt').value = lastPrompts.system;
  document.getElementById('debug-user-prompt').value   = lastPrompts.user;
}

async function handleTestKey(provider, keyInput, statusEl, btn) {
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

// ── Provider change ───────────────────────────────────────────────────────────

const providerSelect = document.getElementById('provider');
providerSelect.addEventListener('change', () => {
  saveFormDefault('provider', providerSelect.value);
});

// ── Show/hide key toggles ─────────────────────────────────────────────────────

document.querySelectorAll('.key-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input     = document.getElementById(btn.dataset.target);
    const showing   = input.type === 'text';
    input.type      = showing ? 'password' : 'text';
    btn.textContent = showing ? 'Show' : 'Hide';
  });
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
let defineSeq     = 0;
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

document.addEventListener('mouseup', async () => {
  if (!defineEnabled) return;
  const sel  = window.getSelection();
  const text = sel?.toString().trim();
  if (!text) { hideDefinePopup(); return; }

  const range       = sel.getRangeAt(0);
  const anchorNode  = range.commonAncestorContainer;
  const contentEl   = document.getElementById('content-display');
  if (!contentEl.contains(anchorNode)) return;
  const anchorEl    = anchorNode.nodeType === Node.TEXT_NODE
    ? anchorNode.parentElement : anchorNode;
  const context     = (anchorEl?.closest('p, h1, h2, h3') ?? anchorEl)?.textContent ?? '';
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
  const mySeq = ++defineSeq;

  try {
    const prompts  = buildDefinePrompt(text, context, targetLang, nativeLang);
    const raw      = await generateContent(prompts, provider, apiKey, model);
    if (mySeq !== defineSeq) return;

    const { lemma, translation } = parseDefineResponse(raw);

    defineResult.textContent = translation;

    const defineLemmaEl = document.getElementById('define-lemma');
    const surfaceForm   = text.toLowerCase();
    const effectiveLemma = lemma ?? surfaceForm;
    if (defineLemmaEl) {
      const showBaseForm = lemma && lemma !== surfaceForm;
      defineLemmaEl.textContent = showBaseForm ? `base: ${lemma}` : '';
      defineLemmaEl.hidden      = !showBaseForm;
    }

    const activeProfile = window.KrashenProfiles?.getActive();
    if (window.KrashenVocab && activeProfile && isVocabEnabled()) {
      if (activeProfile.settings?.autosave) {
        window.KrashenVocab.recordLookup(effectiveLemma, surfaceForm, translation, context);
        showToast('Saved to vocab');
        window.KrashenUI?.refreshVocab();
      } else {
        definePopup.querySelector('.define-save-btn')?.remove();
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save to vocab';
        saveBtn.className   = 'define-save-btn';
        saveBtn.addEventListener('click', () => {
          window.KrashenVocab.recordLookup(effectiveLemma, surfaceForm, translation, context);
          showToast('Saved to vocab');
          window.KrashenUI?.refreshVocab();
          saveBtn.remove();
        });
        definePopup.appendChild(saveBtn);
      }
    }
  } catch (err) {
    if (mySeq !== defineSeq) return;
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
  const list            = document.getElementById('history-list');
  const empty           = document.getElementById('history-empty');
  const filterVal       = document.getElementById('history-filter').value.toLowerCase().trim();
  const profileFilterEl = document.getElementById('history-profile-filter');

  let entries = getHistory().slice().reverse();
  if (filterVal) {
    entries = entries.filter(e =>
      (e.title ?? '').toLowerCase().includes(filterVal) ||
      (e.topic ?? '').toLowerCase().includes(filterVal)
    );
  }
  if (profileFilterEl.checked) {
    const activeId = window.KrashenProfiles?.getActive()?.id;
    if (activeId) entries = entries.filter(e => e.profileId === activeId);
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

    const cefr    = entry.config?.cefrLevel ?? '';
    const source  = entry.source === 'user' ? 'imported' : null;
    const profile = entry.profileName ?? null;
    const detail  = [cefr, `~${entry.wordCount} words`, entry.date, source, profile].filter(Boolean).join(' · ');

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
      persistCurrentEntry(entry);
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

  const active          = window.KrashenProfiles?.getActive();
  const profileFilterEl = document.getElementById('history-profile-filter');
  const profileLabelEl  = document.getElementById('history-profile-filter-text');
  profileFilterEl.disabled = !active;
  if (!active) profileFilterEl.checked = false;
  profileLabelEl.textContent = active
    ? `This profile only (${active.name})`
    : 'This profile only';

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
document.getElementById('history-profile-filter').addEventListener('change', renderHistoryList);

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

// ── Load user text ────────────────────────────────────────────────────────────

document.getElementById('load-text-btn').addEventListener('click', () => {
  document.getElementById('load-text-modal').showModal();
});

document.getElementById('close-load-text').addEventListener('click', () => {
  document.getElementById('load-text-modal').close();
});

document.getElementById('load-text-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.close();
});

document.getElementById('load-from-file-btn').addEventListener('click', () => {
  document.getElementById('load-text-file').click();
});

document.getElementById('load-text-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('load-text-area').value = ev.target.result.trim();
    const titleEl = document.getElementById('load-text-title-input');
    if (!titleEl.value.trim()) {
      titleEl.value = file.name.replace(/\.[^.]+$/, '');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('display-text-btn').addEventListener('click', () => {
  const rawText = document.getElementById('load-text-area').value.trim();
  if (!rawText) return;

  const title     = document.getElementById('load-text-title-input').value.trim() || 'Imported text';
  const content   = `## ${title}\n\n${rawText}`;
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const date      = new Date().toLocaleDateString();

  renderContent(content, { cefrLevel: '', wordCount, topic: title, date });
  document.getElementById('export-piece-btn').hidden = false;

  const activeProfile = window.KrashenProfiles?.getActive();
  persistCurrentEntry({
    id: Date.now(), date, config: null, content, wordCount,
    topic: title, title, source: 'user',
    profileId:   activeProfile?.id   ?? null,
    profileName: activeProfile?.name ?? null,
  });
  appendHistory(currentEntry);

  if (activeProfile) {
    window.KrashenProfiles.incrementWordsRead(activeProfile.id, wordCount);
    window.KrashenUI?.refreshChip();
  }

  document.getElementById('load-text-modal').close();
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

// ── Per-profile form defaults ─────────────────────────────────────────────────

// Natural word-cap pairing for each CEFR level.
// These are the defaults; the user can override word-cap independently after
// selecting a level. See the Generate tab hint for guidance.
const CEFR_DEFAULT_WORD_CAP = {
  A0: 550, A1: 550, A2: 1000, B1: 2000, B2: 3000, C1: 5000, C2: 7500,
};

function saveFormDefault(key, value) {
  const active = window.KrashenProfiles?.getActive();
  if (!active) return;
  window.KrashenProfiles.updateFormDefaults(active.id, { [key]: value });
}

function restoreFormDefaults(profile) {
  const fd = Object.assign(
    {}, window.KrashenProfiles?.DEFAULT_FORM_DEFAULTS, profile.formDefaults ?? {}
  );
  document.getElementById('provider').value        = fd.provider;
  document.getElementById('cefr-level').value      = fd.cefrLevel;
  document.getElementById('word-cap').value        = String(fd.wordCap);
  document.getElementById('target-dialect').value  = fd.targetDialect;
  document.getElementById('target-language').value = fd.targetLanguage;
  document.getElementById('native-language').value = fd.nativeLanguage;
}

(function initFormDefaults() {
  document.getElementById('cefr-level').addEventListener('change', e => {
    saveFormDefault('cefrLevel', e.target.value);
    const defaultCap = CEFR_DEFAULT_WORD_CAP[e.target.value];
    if (defaultCap) {
      document.getElementById('word-cap').value = String(defaultCap);
      saveFormDefault('wordCap', defaultCap);
    }
  });
  document.getElementById('word-cap').addEventListener('change', e =>
    saveFormDefault('wordCap', parseInt(e.target.value, 10))
  );
  document.getElementById('target-dialect').addEventListener('change', e =>
    saveFormDefault('targetDialect', e.target.value)
  );
  document.getElementById('target-language').addEventListener('blur', e =>
    saveFormDefault('targetLanguage', e.target.value.trim())
  );
  document.getElementById('native-language').addEventListener('blur', e =>
    saveFormDefault('nativeLanguage', e.target.value.trim())
  );

  window.KrashenProfiles?.onSwitch(restoreFormDefaults);

  const active = window.KrashenProfiles?.getActive();
  if (active) restoreFormDefaults(active);
})();

// ── Main event wiring ─────────────────────────────────────────────────────────

document.getElementById('config-form').addEventListener('submit', handleGenerate);
initProviderSection();
initDisplayPopover();

// ── Restore last content after page reload ────────────────────────────────────

(function restoreSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('krashen_current') ?? 'null');
    if (!saved?.content) return;
    currentEntry = saved;
    renderContent(saved.content, {
      cefrLevel: saved.config?.cefrLevel ?? '',
      wordCount:  saved.wordCount,
      topic:      saved.topic ?? '',
      date:       saved.date,
    });
    document.getElementById('export-piece-btn').hidden = false;
  } catch (_) {}
})();

// ── Version display ───────────────────────────────────────────────────────────

fetch('./package.json')
  .then(r => r.json())
  .then(pkg => {
    const el = document.getElementById('app-version');
    if (el && pkg.version) el.textContent = `v${pkg.version}`;
  })
  .catch(() => {});
