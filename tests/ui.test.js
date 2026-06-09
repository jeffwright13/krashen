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
    <button role="tab" class="tab-btn" id="tab-btn-configure"
      aria-selected="true" tabindex="0">Configure</button>
    <button role="tab" class="tab-btn" id="tab-btn-vocab"
      aria-selected="false" tabindex="-1">Vocab</button>
  </div>
  <div id="tab-configure" class="tab-panel"></div>
  <div id="tab-vocab" class="tab-panel" hidden>
    <input type="checkbox" id="vocab-enabled">
    <div id="vocab-features" hidden>
      <span id="vocab-total"></span>
      <p id="vocab-no-profile" hidden></p>
      <p id="vocab-empty" hidden></p>
      <p id="vocab-mastery-breakdown" hidden></p>
      <div id="vocab-term-list"></div>
      <button id="export-anki-btn" hidden></button>
      <button id="clear-vocab-btn" hidden></button>
      <input type="checkbox" id="vocab-hint-enabled">
      <input type="checkbox" id="vocab-hint-autosave">
      <div id="vocab-hint-fields" hidden></div>
      <select id="vocab-hint-known-threshold">
        <option value="1">1</option><option value="2" selected>2</option>
        <option value="3">3</option><option value="4">4</option>
      </select>
      <select id="vocab-hint-new-words">
        <option value="3">3</option><option value="5" selected>5</option>
        <option value="8">8</option><option value="10">10</option>
      </select>
      <select id="vocab-hint-reexpose-count">
        <option value="5">5</option><option value="8" selected>8</option>
        <option value="12">12</option>
      </select>
      <select id="vocab-hint-reexpose-mastery">
        <option value="1">1</option><option value="2">2</option>
        <option value="3" selected>3</option><option value="4">4</option>
      </select>
    </div>
  </div>
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
      autosave: false, vocabHintsEnabled: true, knownThreshold: 2,
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
  it('Configure tab is visible on load', () => {
    expect(document.getElementById('tab-configure').hidden).toBe(false);
  });

  it('Vocab tab is hidden on load', () => {
    expect(document.getElementById('tab-vocab').hidden).toBe(true);
  });

  it('Configure tab button has aria-selected="true"', () => {
    expect(document.getElementById('tab-btn-configure').getAttribute('aria-selected')).toBe('true');
  });

  it('Vocab tab button has aria-selected="false"', () => {
    expect(document.getElementById('tab-btn-vocab').getAttribute('aria-selected')).toBe('false');
  });
});

describe('tab switching — clicking tabs', () => {
  it('clicking Vocab tab shows vocab panel and hides Configure', () => {
    document.getElementById('tab-btn-vocab').click();
    expect(document.getElementById('tab-vocab').hidden).toBe(false);
    expect(document.getElementById('tab-configure').hidden).toBe(true);
  });

  it('clicking Vocab tab sets its button aria-selected="true"', () => {
    document.getElementById('tab-btn-vocab').click();
    expect(document.getElementById('tab-btn-vocab').getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('tab-btn-configure').getAttribute('aria-selected')).toBe('false');
  });

  it('clicking Configure tab returns to configure panel', () => {
    document.getElementById('tab-btn-vocab').click();
    document.getElementById('tab-btn-configure').click();
    expect(document.getElementById('tab-configure').hidden).toBe(false);
    expect(document.getElementById('tab-vocab').hidden).toBe(true);
  });

  it('only one panel is visible at a time', () => {
    document.getElementById('tab-btn-vocab').click();
    const panels = ['configure', 'vocab'];
    const visible = panels.filter(id => !document.getElementById('tab-' + id).hidden);
    expect(visible).toHaveLength(1);
    expect(visible[0]).toBe('vocab');
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

// ── applyVocabEnabled ──────────────────────────────────────────────────────────

describe('applyVocabEnabled', () => {
  it('hides #vocab-features when disabled', () => {
    window.KrashenUI.applyVocabEnabled(false);
    expect(document.getElementById('vocab-features').hidden).toBe(true);
  });

  it('shows #vocab-features when enabled', () => {
    window.KrashenUI.applyVocabEnabled(true);
    expect(document.getElementById('vocab-features').hidden).toBe(false);
  });

  it('syncs the vocab-enabled checkbox', () => {
    window.KrashenUI.applyVocabEnabled(true);
    expect(document.getElementById('vocab-enabled').checked).toBe(true);
    window.KrashenUI.applyVocabEnabled(false);
    expect(document.getElementById('vocab-enabled').checked).toBe(false);
  });
});

// ── Tab order ──────────────────────────────────────────────────────────────────

describe('tab order', () => {
  it('tab buttons appear in Configure | Vocab order', () => {
    const btns = [...document.querySelectorAll('#tab-bar .tab-btn')];
    const ids  = btns.map(b => b.id);
    expect(ids).toEqual(['tab-btn-configure', 'tab-btn-vocab']);
  });
});

// ── Vocab tab — SRS fields ─────────────────────────────────────────────────────

describe('vocab tab — vocab hint fields', () => {
  it('vocab-hint-enabled reflects active profile vocabHintsEnabled setting', () => {
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { vocabHintsEnabled: true, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('vocab-hint-enabled').checked).toBe(true);
  });

  it('vocab-hint-fields is hidden when vocabHintsEnabled is false', () => {
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { vocabHintsEnabled: false, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('vocab-hint-fields').hidden).toBe(true);
  });

  it('known threshold select reflects profile setting', () => {
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { vocabHintsEnabled: true, autosave: false, knownThreshold: 3,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('vocab-hint-known-threshold').value).toBe('3');
  });

  it('toggling vocab-hint-enabled unchecked hides vocab-hint-fields', () => {
    // Start with vocabHintsEnabled true (fields visible)
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { vocabHintsEnabled: true, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('vocab');
    expect(document.getElementById('vocab-hint-fields').hidden).toBe(false);

    // Uncheck the toggle
    const chk = document.getElementById('vocab-hint-enabled');
    chk.checked = false;
    chk.dispatchEvent(new Event('change'));
    expect(document.getElementById('vocab-hint-fields').hidden).toBe(true);
  });

  it('changing a field calls updateSettings with correct values', () => {
    const mockUpdate = vi.fn();
    window.KrashenProfiles.getActive = () => ({
      id: 'p1', name: 'Alice', wordsRead: 0,
      settings: { vocabHintsEnabled: true, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenProfiles.updateSettings = mockUpdate;

    window.KrashenUI.activateTab('vocab');
    const sel = document.getElementById('vocab-hint-known-threshold');
    sel.value = '4';
    sel.dispatchEvent(new Event('change'));

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdate.mock.calls[0][0]).toBe('p1');
    expect(mockUpdate.mock.calls[0][1].knownThreshold).toBe(4);
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
