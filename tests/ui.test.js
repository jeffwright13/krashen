// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from 'vitest';

// Minimal DOM fixture — every element ui.js's IIFE touches must be present
const FIXTURE = `
  <div id="profile-chip">
    <div id="profile-chip-summary">
      <span id="chip-profile-name">No profile</span>
      <span id="chip-words-read"></span>
      <button id="chip-toggle-btn" aria-expanded="false" aria-controls="profile-chip-panel">▾</button>
    </div>
    <div id="profile-chip-panel" hidden>
      <div class="chip-profile-row">
        <select id="profile-select"></select>
        <button id="new-profile-btn"></button>
        <button id="delete-profile-btn" disabled></button>
      </div>
      <div id="new-profile-form" hidden>
        <input id="new-profile-name">
        <button id="confirm-new-profile"></button>
        <button id="cancel-new-profile"></button>
      </div>
      <div class="chip-profile-row">
        <button id="export-profile-btn" disabled></button>
        <button id="import-profile-btn"></button>
        <input type="file" id="import-profile-input" hidden>
      </div>
      <p id="import-profile-status" hidden></p>
    </div>
  </div>
  <div id="tab-bar" role="tablist">
    <button role="tab" class="tab-btn" id="tab-btn-generate"
      aria-selected="true" tabindex="0">Generate</button>
    <button role="tab" class="tab-btn" id="tab-btn-vocab"
      aria-selected="false" tabindex="-1">Vocab</button>
    <button role="tab" class="tab-btn" id="tab-btn-tuning"
      aria-selected="false" tabindex="-1">Tuning</button>
    <button role="tab" class="tab-btn" id="tab-btn-settings"
      aria-selected="false" tabindex="-1">Settings</button>
  </div>
  <div id="tab-generate" class="tab-panel"></div>
  <div id="tab-vocab"    class="tab-panel" hidden></div>
  <div id="tab-tuning"   class="tab-panel" hidden></div>
  <div id="tab-settings" class="tab-panel" hidden></div>
  <div id="tab-tuning" class="tab-panel" hidden>
    <p id="tuning-no-profile" hidden></p>
    <input type="checkbox" id="srs-enabled">
    <input type="checkbox" id="srs-autosave">
    <div id="srs-fields" hidden></div>
    <select id="srs-known-threshold">
      <option value="1">1</option><option value="2" selected>2</option>
      <option value="3">3</option><option value="4">4</option>
    </select>
    <select id="srs-new-words">
      <option value="3">3</option><option value="5" selected>5</option>
      <option value="8">8</option><option value="10">10</option>
    </select>
    <select id="srs-reexpose-count">
      <option value="5">5</option><option value="8" selected>8</option>
      <option value="12">12</option>
    </select>
    <select id="srs-reexpose-mastery">
      <option value="1">1</option><option value="2">2</option>
      <option value="3" selected>3</option><option value="4">4</option>
    </select>
  </div>
  <div id="tab-vocab" class="tab-panel" hidden>
    <span id="vocab-total"></span>
    <p id="vocab-no-profile" hidden></p>
    <p id="vocab-empty" hidden></p>
    <p id="vocab-mastery-breakdown" hidden></p>
    <div id="vocab-term-list"></div>
    <button id="clear-vocab-btn" hidden></button>
  </div>
  <div id="tab-settings" class="tab-panel" hidden></div>
`;

beforeAll(async () => {
  document.body.innerHTML = FIXTURE;

  // Minimal stubs so ui.js doesn't throw on KrashenProfiles/KrashenVocab access
  window.KrashenProfiles = {
    getActive:          () => null,
    getAll:             () => [],
    onSwitch:           () => {},
    updateSettings:     vi.fn(),
    updateFormDefaults: vi.fn(),
    importProfileVocab: vi.fn().mockReturnValue(true),
    createFromBundle:   vi.fn().mockReturnValue({ id: 'new', name: 'Imported', settings: {}, formDefaults: {} }),
    DEFAULT_SETTINGS: {
      autosave: false, srsEnabled: true, knownThreshold: 2,
      newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3,
    },
    DEFAULT_FORM_DEFAULTS: {
      provider: 'openai', cefrLevel: 'A2', wordCap: 1000,
      targetLanguage: 'Spanish', targetDialect: 'Neutral', nativeLanguage: 'English',
    },
  };
  window.KrashenVocab = { getStore: () => ({}) };

  // ui.js is cached after first import — subsequent describe blocks reuse same instance
  try { await import('../js/ui.js'); } catch (_) {}
});

// ── Tab switching ──────────────────────────────────────────────────────────────

describe('tab switching — initial state', () => {
  it('Generate tab is visible on load', () => {
    expect(document.getElementById('tab-generate').hidden).toBe(false);
  });

  it('other tabs are hidden on load', () => {
    expect(document.getElementById('tab-vocab').hidden).toBe(true);
    expect(document.getElementById('tab-tuning').hidden).toBe(true);
    expect(document.getElementById('tab-settings').hidden).toBe(true);
  });

  it('Generate tab button has aria-selected="true"', () => {
    expect(document.getElementById('tab-btn-generate').getAttribute('aria-selected')).toBe('true');
  });

  it('other tab buttons have aria-selected="false"', () => {
    ['vocab', 'tuning', 'settings'].forEach(id => {
      expect(document.getElementById('tab-btn-' + id).getAttribute('aria-selected')).toBe('false');
    });
  });
});

describe('tab switching — clicking tabs', () => {
  it('clicking Vocab tab shows vocab panel and hides others', () => {
    document.getElementById('tab-btn-vocab').click();
    expect(document.getElementById('tab-vocab').hidden).toBe(false);
    expect(document.getElementById('tab-generate').hidden).toBe(true);
    expect(document.getElementById('tab-tuning').hidden).toBe(true);
    expect(document.getElementById('tab-settings').hidden).toBe(true);
  });

  it('clicking Vocab tab sets its button aria-selected="true"', () => {
    document.getElementById('tab-btn-vocab').click();
    expect(document.getElementById('tab-btn-vocab').getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('tab-btn-generate').getAttribute('aria-selected')).toBe('false');
  });

  it('clicking Tuning tab shows tuning panel', () => {
    document.getElementById('tab-btn-tuning').click();
    expect(document.getElementById('tab-tuning').hidden).toBe(false);
    expect(document.getElementById('tab-vocab').hidden).toBe(true);
  });

  it('clicking Settings tab shows settings panel', () => {
    document.getElementById('tab-btn-settings').click();
    expect(document.getElementById('tab-settings').hidden).toBe(false);
  });

  it('clicking Generate tab returns to generate panel', () => {
    document.getElementById('tab-btn-settings').click();
    document.getElementById('tab-btn-generate').click();
    expect(document.getElementById('tab-generate').hidden).toBe(false);
    expect(document.getElementById('tab-settings').hidden).toBe(true);
  });

  it('only one panel is visible at a time', () => {
    document.getElementById('tab-btn-tuning').click();
    const panels = ['generate', 'vocab', 'tuning', 'settings'];
    const visible = panels.filter(id => !document.getElementById('tab-' + id).hidden);
    expect(visible).toHaveLength(1);
    expect(visible[0]).toBe('tuning');
  });
});

// ── Profile chip ───────────────────────────────────────────────────────────────

describe('profile chip — no active profile', () => {
  it('shows "No profile" when no profile is active', () => {
    expect(document.getElementById('chip-profile-name').textContent).toBe('No profile');
  });

  it('words-read is empty when no profile is active', () => {
    expect(document.getElementById('chip-words-read').textContent).toBe('');
  });
});

describe('profile chip — with active profile', () => {
  it('updates chip text when refreshChip is called with an active profile', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 1240 });
    window.KrashenUI.refreshChip();
    expect(document.getElementById('chip-profile-name').textContent).toBe('Alice');
    expect(document.getElementById('chip-words-read').textContent).toContain('1');
  });
});

// ── Tuning tab ─────────────────────────────────────────────────────────────────

describe('tuning tab — SRS fields', () => {
  it('srs-enabled reflects active profile srsEnabled setting', () => {
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { srsEnabled: true, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('tuning');
    expect(document.getElementById('srs-enabled').checked).toBe(true);
  });

  it('srs-fields is hidden when srsEnabled is false', () => {
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { srsEnabled: false, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('tuning');
    expect(document.getElementById('srs-fields').hidden).toBe(true);
  });

  it('known threshold select reflects profile setting', () => {
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { srsEnabled: true, autosave: false, knownThreshold: 3,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('tuning');
    expect(document.getElementById('srs-known-threshold').value).toBe('3');
  });

  it('toggling srs-enabled unchecked hides srs-fields', () => {
    // Start with srsEnabled true (fields visible)
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { srsEnabled: true, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('tuning');
    expect(document.getElementById('srs-fields').hidden).toBe(false);

    // Uncheck the toggle
    const chk = document.getElementById('srs-enabled');
    chk.checked = false;
    chk.dispatchEvent(new Event('change'));
    expect(document.getElementById('srs-fields').hidden).toBe(true);
  });

  it('changing a field calls updateSettings with correct values', () => {
    const mockUpdate = vi.fn();
    window.KrashenProfiles.getActive = () => ({
      id: 'p1', name: 'Alice', wordsRead: 0,
      settings: { srsEnabled: true, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenProfiles.updateSettings = mockUpdate;

    window.KrashenUI.activateTab('tuning');
    const sel = document.getElementById('srs-known-threshold');
    sel.value = '4';
    sel.dispatchEvent(new Event('change'));

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdate.mock.calls[0][0]).toBe('p1');
    expect(mockUpdate.mock.calls[0][1].knownThreshold).toBe(4);
  });

  it('shows no-profile hint when no profile is active', () => {
    window.KrashenProfiles.getActive = () => null;
    window.KrashenUI.activateTab('tuning');
    expect(document.getElementById('tuning-no-profile').hidden).toBe(false);
  });

  it('hides no-profile hint when a profile is active', () => {
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { srsEnabled: true, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('tuning');
    expect(document.getElementById('tuning-no-profile').hidden).toBe(true);
  });
});

// ── Vocab tab ──────────────────────────────────────────────────────────────────

describe('vocab tab — no profile', () => {
  it('shows no-profile hint when no profile is active', () => {
    window.KrashenProfiles.getActive = () => null;
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('vocab-no-profile').hidden).toBe(false);
  });

  it('hides clear button and breakdown when no profile', () => {
    window.KrashenProfiles.getActive = () => null;
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('clear-vocab-btn').hidden).toBe(true);
    expect(document.getElementById('vocab-mastery-breakdown').hidden).toBe(true);
  });
});

describe('vocab tab — empty store', () => {
  it('shows empty-state hint when vocab store has no entries', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 0, settings: {} });
    window.KrashenVocab = { getStore: () => ({}) };
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('vocab-empty').hidden).toBe(false);
    expect(document.getElementById('clear-vocab-btn').hidden).toBe(true);
  });

  it('hides breakdown when store is empty', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 0, settings: {} });
    window.KrashenVocab = { getStore: () => ({}) };
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('vocab-mastery-breakdown').hidden).toBe(true);
  });
});

describe('vocab tab — with entries', () => {
  const mockStore = {
    hola:  { term: 'hola',  mastery: 2, lastSeen: 2000 },
    gato:  { term: 'gato',  mastery: 1, lastSeen: 1000 },
  };
  const mockStoreWithUserMastery = {
    hola: { term: 'hola', mastery: 2, userMastery: 4, lastSeen: 2000 },
    gato: { term: 'gato', mastery: 1,                 lastSeen: 1000 },
  };

  it('shows word count in vocab-total', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 0, settings: {} });
    window.KrashenVocab = { getStore: () => mockStore };
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('vocab-total').textContent).toBe('2 words');
  });

  it('shows mastery breakdown', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 0, settings: {} });
    window.KrashenVocab = { getStore: () => mockStore };
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('vocab-mastery-breakdown').hidden).toBe(false);
  });

  it('renders term list sorted by lastSeen descending', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 0, settings: {} });
    window.KrashenVocab = { getStore: () => mockStore };
    window.KrashenUI.activateTab('vocab');
    const items = document.querySelectorAll('#vocab-term-list .vocab-item');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('.vocab-term').textContent).toBe('hola');
    expect(items[1].querySelector('.vocab-term').textContent).toBe('gato');
  });

  it('shows clear button when entries exist', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 0, settings: {} });
    window.KrashenVocab = { getStore: () => mockStore };
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('clear-vocab-btn').hidden).toBe(false);
  });

  it('hides no-profile and empty hints when entries exist', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 0, settings: {} });
    window.KrashenVocab = { getStore: () => mockStore };
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('vocab-no-profile').hidden).toBe(true);
    expect(document.getElementById('vocab-empty').hidden).toBe(true);
  });

  it('shows userMastery in mastery badge when set', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 0, settings: {} });
    window.KrashenVocab = { getStore: () => mockStoreWithUserMastery };
    window.KrashenUI.activateTab('vocab');
    const items = document.querySelectorAll('#vocab-term-list .vocab-item');
    // hola has userMastery:4, should show M4 not M2
    const holaMastery = items[0].querySelector('.vocab-mastery').textContent;
    expect(holaMastery).toBe('M4');
  });

  it('applies vocab-mastery-user class when userMastery is set', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 0, settings: {} });
    window.KrashenVocab = { getStore: () => mockStoreWithUserMastery };
    window.KrashenUI.activateTab('vocab');
    const items = document.querySelectorAll('#vocab-term-list .vocab-item');
    expect(items[0].querySelector('.vocab-mastery').classList.contains('vocab-mastery-user')).toBe(true);
    expect(items[1].querySelector('.vocab-mastery').classList.contains('vocab-mastery-user')).toBe(false);
  });

  it('uses userMastery in breakdown counts when set', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 0, settings: {} });
    window.KrashenVocab = { getStore: () => mockStoreWithUserMastery };
    window.KrashenUI.activateTab('vocab');
    const breakdown = document.getElementById('vocab-mastery-breakdown').textContent;
    // hola: userMastery=4 (not mastery=2), gato: mastery=1
    expect(breakdown).toContain('1×M1');
    expect(breakdown).toContain('1×M4');
    expect(breakdown).not.toContain('1×M2');
  });
});
